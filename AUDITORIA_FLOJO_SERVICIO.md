# Auditoría de flexibilidad y trazabilidad del flujo de servicio — GonMotor

Fecha: 2026-10-20
Fuentes verificadas: `../gonmotor-api/backend/apps/` (models, serializers, views, tests) y `gonmotor-ui/src/`.
Convención: **[V]** = verificado en código · **[I]** = inferencia marcada.

---

## 1. Matriz de los 8 escenarios

| # | Escenario | Soporte | Evidencia clave |
|---|---|---|---|
| 1 | Cita agendada | ✅ **Soportado** | `Cita.convertir_a_recepcion()` con bloqueo de doble conversión (`citas/models.py:184-227`); vinculación bidireccional opcional vía `relaciones/` (`ordenes/relaciones_flujo.py:314-319`); UI `CitasView.vue:264`, `RelacionesFlujoEdit.vue:40` (cita admite múltiples) |
| 2 | Llega sin cita, pide reparación | ✅ **Soportado** | Recepción sin FK a cita y sin campo en el form (`RecepcionEdit.vue` — sin campo cita); inspección sin recepción permitida (`ordenes/models.py:623-638`, test `ordenes/tests.py:289`); cotización independiente sin inspección permitida (`cotizaciones/tests.py:169`, docstring `services.py:3-6`) |
| 3 | Deja vehículo solo para diagnóstico | ✅ **Soportado** | Flujo recepción→inspección (máx. 1 viva por recepción, constraint `ordenes/models.py:720-725`) o inspección directa sin recepción (campos propios `cliente`/`vehiculo`, `:623-638`); la inspección puede quedar FINALIZADA sin cotización ni OT |
| 4 | Cotiza y retira sin reparar | ✅ **Soportado** | Recepción `NO_ACEPTADA` con motivo obligatorio y **sin fotos obligatorias** (`ordenes/serializers.py:845-852, 872-873`); cotización → `RECHAZADA` total (`cotizaciones/serializers.py:36`); rechazo reenviable (`:38`) |
| 5 | Acepta cotización y regresa otro día | ✅ **Soportado** | La cotización **permanece ACEPTADA sin generar OT** (`cotizaciones/models.py:355-356`); `generar_orden` se invoca después (`views.py:230-251`, exige ACEPTADA sin OT); la OT nace en PENDIENTE hasta que se inicie |
| 6 | Acepta **solo parte** de la cotización | ❌ **No soportado** | No existe estado por ítem: detalles solo tienen `es_opcional` (`cotizaciones/models.py:374, 400`); aceptación y rechazo son **totales** (`serializers.py:36-42, 233-240`); `es_opcional` es cosmético — los totales y `generar_orden` incluyen los opcionales (`recalcular_totales :139-171`, copia `_crear_orden_trabajo :291-310`). Único workaround: rechazar y re-cotizar a mano (pierde trazabilidad de la oferta original) |
| 7 | Trabajos adicionales durante la OT con autorización | ⚠️ **Parcial** | Existe el flujo comercial: cotización con `orden_trabajo_origen` = la OT (`cotizaciones/models.py:80-87`, guard en `generar_orden :328-336`: «Cotiza el trabajo adicional desde esa orden»). **Pero nada lo exige**: las líneas se agregan a la OT abierta sin gate de autorización (`ordenes/views.py:831-842` — solo bloquea CANCELADA; UI `OrdenEdit.vue:1409-1412` sin gate por estado). La cotización adicional aceptada tampoco copia sus ítems a la OT automáticamente (no puede generar OT propia) |
| 8 | OT completada, pendiente de entrega | ✅ **Soportado** | Estados `COMPLETADO → ENTREGADO` (`ordenes/models.py:36-42`); la entrega sella `fecha_entrega` y propaga `fecha_salida` a recepciones (`ordenes/signals.py:9-34`). *Nota:* no hay campo `entregado_por` (ausencia verificada en `:29-174`) ni estado separado «listo para entrega» (COMPLETADO cumple ese rol) |

**Resumen: 6 soportados, 1 parcial (autorización de adicionales), 1 no soportado (aceptación parcial).**

---

## 2. Modelo de relaciones actual (cardinalidades verificadas)

```
Cita ──recepcion_generada (SET_NULL)──► RecepcionVehiculo
  1 cita → máx. 1 recepción (bloqueo :196-197)      │
  N citas → 1 recepción (permitido)                  │ recepcion FK, máx. 1 viva
                                                     ▼
                                          InspeccionVehiculo
                                          1:1 ↔ OT (OneToOne :607-614)
                                                     │
   RecepcionVehiculo ──recepciones (N:1 :327-334)──► OrdenTrabajo ◄──┐
                                                     ▲               │
                          cotizacion_origen (OneToOne :78-85)        │
                                                     │               │
                          Cotizacion ──orden_trabajo_origen (N:1)────┘  ← "trabajo adicional"
                          │   ├─ recepcion_origen   (N:1, SET_NULL)
                          │   └─ inspeccion_origen  (N:1, SET_NULL)
                          ▼
              DetalleServicio/RepuestoCotizacion (solo es_opcional; SIN estado por ítem)
```

- **N cotizaciones por recepción/inspección/vehículo** — tests explícitos (`cotizaciones/tests.py:415, 448, 469`).
- **1 OT por cotización** (OneToOne + doble chequeo `cotizaciones/models.py:319-320`); **N cotizaciones por OT** (trabajo adicional).
- **Cualquier etapa es omitible**: OT sin cotización (`ordenes/tests.py:563`), cotización sin inspección, inspección sin recepción, recepción sin cita — verificado en backend y frontend.
- Cada documento **denormaliza** cliente/vehículo/sucursal propios; el grafo se reconstruye en `ordenes/relaciones_flujo.py` y se agrupa en «visitas» por vehículo en `vehiculos/historial.py:172-219` (union-find sobre las FKs).

---

## 3. Hallazgos críticos

### Bloqueantes de flexibilidad

1. **Aceptación parcial imposible** (esc. 6): sin `aprobado` por línea, el «cliente acepta solo X» obliga a rechazar y rehacer la cotización; se pierde el historial de lo ofrecido. *(Verificado.)*
2. **Trabajos adicionales sin autorización forzada** (esc. 7): agregar/quitar líneas en una OT abierta no requiere cotización, aprobación ni registro de quién autorizó (`ordenes/views.py:831-842`; `OrdenEdit.vue:1409-1412`). El PDF dice «ningún trabajo adicional sin aprobación» (`ordenes/pdf_orden.py:389`) pero **es solo texto**. Riesgo directo de trabajos sin autorizar y facturación impugnable. *(Verificado.)*
3. **Reapertura de cotización ACEPTADA ignorando la OT generada**: `ACEPTADA→ENVIADA` no comprueba `orden_trabajo` (`cotizaciones/serializers.py:40-42`; test `tests.py:225-232` lo confirma). Tras reabrirla se pueden editar ítems cuya copia ya vive en la OT → desincronización cotización↔OT. *(Verificado; desincronización [I].)*

### Inconsistencias de estado

4. **Entrega sin garantías**: se puede entregar con servicios sin `completado` (nadie exige el flag, `ordenes/models.py:223` sin referencias en views/serializers) y `test_se_puede_saltar_etapas` permite PENDIENTE→ENTREGADO (`ordenes/tests.py:521-528`). Además, la reapertura de una OT ENTREGADA **no revierte** `fecha_salida` de las recepciones (signal unidireccional, `ordenes/signals.py:26-34`) → vehículo «fuera del taller» en registros estando dentro. *(Verificado; lo último [I] con base en el signal.)*
5. **`estado` de recepción escribible vía PATCH sin firma**: el serializer no valida transiciones ni exige firma para ACEPTADA (`ordenes/serializers.py:693-708, 840-853`) → inconsistencia estado=ACEPTADA / `aceptacion_condiciones=False`. *(Verificado por ausencia de validación.)*
6. **VENCIDA es un estado sin motor**: `validez_dias` nunca se evalúa; ninguna cotización vence sola (grep verificado).

### Riesgos de duplicidad y trazabilidad

7. **Duplicidad de visitas/cotizaciones**: nada impide N recepciones para el mismo vehículo en el mismo día (la capacidad solo aplica a citas, `citas/services.py:221-251`); varias cotizaciones vigentes coexisten por diseño (tests `:415, 448`). Sin entidad de «visita» propia, la unicidad depende del criterio humano. *(Verificado.)*
8. **Dos fuentes de verdad cotización↔OT**: `OrdenTrabajo.cotizacion_origen` (OneToOne) y `Cotizacion.orden_trabajo_origen` (FK) pueden desalinearse; `relaciones_flujo.py:112-116` ya consulta ambos. *(Verificado.)*
9. **Sin historial de transiciones**: no existe modelo de eventos/auditoría (grep verificado). Solo quedan campos sueltos (`fecha_aceptacion`, `aceptada_por`, `fecha_entrega`); no se registra quién rechazó, quién completó, quién agregó una línea adicional ni cuándo cambió un estado. El historial de visitas por vehículo (`vehiculos/historial.py`) reconstruye el **qué**, no el **quién/cuándo** de cada transición.
10. **Borrado**: `Cotizacion.cliente` es CASCADE (`cotizaciones/models.py:34`) vs PROTECT en recepciones/OT — mitigado por soft-delete si siempre se usa, pero asimétrico. *(Riesgo [I].)*

---

## 4. Recomendación

**Mantener el modelo de relaciones; no incorporar `SolicitudServicio`.** Ajustar estados y validaciones en los puntos 1–5.

**Por qué no `SolicitudServicio`:** la entidad que agrupa la «visita» ya existe *virtualmente* — el grafo de FKs (`relaciones_flujo.py`) + el historial del vehículo (`vehiculos/historial.py:172-219`) reconstruyen el proceso completo, incluidas visitas recurrentes, y el frontend ya lo pinta en `RelacionesFlujo`/`VehicleHistory`. Una entidad superior añadiría un **tercer conjunto de vínculos** que se desincronizaría con los existentes (ya hay dos fuentes de verdad cotización↔OT, hallazgo 8) y requeriría migrar/backfillear todos los documentos históricos. Coste alto, beneficio marginal. **[I — recomendación]**

**Ajustes prioritarios (por ROI):**

1. **Aceptación parcial** (habilita esc. 6): añadir `aprobado` (default `true`) a `DetalleServicioCotizacion`/`DetalleRepuestoCotizacion`; filtrar `aprobado=True` en `recalcular_totales`, `generar_orden` y el PDF; UI de checkboxes en la vista de cotización. Es un cambio focal y no rompe datos existentes.
2. **Gate de autorización en OT** (habilita esc. 7): al agregar líneas a una OT nacida de cotización, exigir o bien cotización vigente aceptada con `orden_trabajo_origen` = esa OT, o bien un flag `autorizado_por`/`fecha_autorizacion` en la línea. Cerrar el hueco del hallazgo 2.
3. **Endurecer la máquina de estados**: bloquear `ACEPTADA→ENVIADA` si la cotización ya generó OT (o forzar antes cancelación de la OT); en OT, exigir servicios completados (o justificación explícita) para ENTREGADO; hacer reversible o condicional la `fecha_salida` al reabrir.
4. **Cierre de trazabilidad**: `estado` de recepción solo escribible vía `firmar` (quitar de escritura del serializer o validar transiciones); auditoría ligera de transiciones (tabla `EventoFlujo` con documento, estado anterior/nuevo, usuario, fecha) — con ella bastaría para cubrir «quién autorizó el trabajo adicional».
5. **Duplicidad operativa**: validación blanda al crear recepción («vehículo ya tiene recepción sin `fecha_salida`» → warning, no bloqueo) apoyada en el historial.

Con estos cinco ajustes, los 8 escenarios quedan soportados con trazabilidad completa **sin tocar el grafo de entidades actual**.
