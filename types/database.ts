
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      aditivos_biodigestor: {
        Row: {
          cantidad_kg: number
          created_at: string | null
          equipo_id: number
          fecha_hora: string
          id: number
          observaciones: string | null
          planta_id: number
          tipo_aditivo: string
          usuario_operador_id: number
        }
        Insert: {
          cantidad_kg: number
          created_at?: string | null
          equipo_id: number
          fecha_hora: string
          id?: number
          observaciones?: string | null
          planta_id: number
          tipo_aditivo: string
          usuario_operador_id: number
        }
        Update: {
          cantidad_kg?: number
          created_at?: string | null
          equipo_id?: number
          fecha_hora?: string
          id?: number
          observaciones?: string | null
          planta_id?: number
          tipo_aditivo?: string
          usuario_operador_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "aditivos_biodigestor_equipo_fkey"
            columns: ["equipo_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aditivos_biodigestor_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aditivos_biodigestor_usuario_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      alarmas: {
        Row: {
          acciones_tomadas: string | null
          created_at: string | null
          descripcion_alarma_ocurrida: string | null
          equipo_id: number | null
          fecha_hora_activacion: string
          fecha_hora_resolucion: string | null
          id: number
          planta_id: number
          resuelta: boolean | null
          severidad: Database["public"]["Enums"]["severidad_enum"] | null
          tiempo_resolucion_minutos: number | null
          tipo_alarma_id: number
          updated_at: string | null
          usuario_resolucion_id: number | null
        }
        Insert: {
          acciones_tomadas?: string | null
          created_at?: string | null
          descripcion_alarma_ocurrida?: string | null
          equipo_id?: number | null
          fecha_hora_activacion: string
          fecha_hora_resolucion?: string | null
          id?: number
          planta_id: number
          resuelta?: boolean | null
          severidad?: Database["public"]["Enums"]["severidad_enum"] | null
          tiempo_resolucion_minutos?: number | null
          tipo_alarma_id: number
          updated_at?: string | null
          usuario_resolucion_id?: number | null
        }
        Update: {
          acciones_tomadas?: string | null
          created_at?: string | null
          descripcion_alarma_ocurrida?: string | null
          equipo_id?: number | null
          fecha_hora_activacion?: string
          fecha_hora_resolucion?: string | null
          id?: number
          planta_id?: number
          resuelta?: boolean | null
          severidad?: Database["public"]["Enums"]["severidad_enum"] | null
          tiempo_resolucion_minutos?: number | null
          tipo_alarma_id?: number
          updated_at?: string | null
          usuario_resolucion_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alarmas_equipo_fkey"
            columns: ["equipo_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmas_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmas_tipo_fkey"
            columns: ["tipo_alarma_id"]
            referencedRelation: "tipos_alarma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmas_usuario_resolucion_fkey"
            columns: ["usuario_resolucion_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      alimentacion_biodigestor: {
        Row: {
          cantidad: number
          created_at: string | null
          equipo_destino_id: number
          equipo_origen_id: number
          fecha_hora: string
          id: number
          observaciones: string | null
          planta_id: number
          unidad: string
          usuario_operador_id: number
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          equipo_destino_id: number
          equipo_origen_id: number
          fecha_hora: string
          id?: number
          observaciones?: string | null
          planta_id: number
          unidad: string
          usuario_operador_id: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          equipo_destino_id?: number
          equipo_origen_id?: number
          fecha_hora?: string
          id?: number
          observaciones?: string | null
          planta_id?: number
          unidad?: string
          usuario_operador_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "alimentacion_biodigestor_equipo_destino_id_fkey"
            columns: ["equipo_destino_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alimentacion_biodigestor_equipo_origen_id_fkey"
            columns: ["equipo_origen_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alimentacion_biodigestor_planta_id_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alimentacion_biodigestor_usuario_operador_id_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      analisis_fos_tac: {
        Row: {
          created_at: string | null
          equipo_id: number
          fecha_hora: string
          fos_mg_l: number | null
          id: number
          numero_replica: number
          observaciones: string | null
          ph: number | null
          planta_id: number
          relacion_fos_tac: number | null
          tac_mg_l: number | null
          updated_at: string | null
          usuario_operador_id: number
          volumen_1_ml: number | null
          volumen_2_ml: number | null
        }
        Insert: {
          created_at?: string | null
          equipo_id: number
          fecha_hora: string
          fos_mg_l?: never
          id?: number
          numero_replica?: number
          observaciones?: string | null
          ph?: number | null
          planta_id: number
          relacion_fos_tac?: never
          tac_mg_l?: never
          updated_at?: string | null
          usuario_operador_id: number
          volumen_1_ml?: number | null
          volumen_2_ml?: number | null
        }
        Update: {
          created_at?: string | null
          equipo_id?: number
          fecha_hora?: string
          fos_mg_l?: never
          id?: number
          numero_replica?: number
          observaciones?: string | null
          ph?: number | null
          planta_id?: number
          relacion_fos_tac?: never
          tac_mg_l?: never
          updated_at?: string | null
          usuario_operador_id?: number
          volumen_1_ml?: number | null
          volumen_2_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_fos_tac_equipo_fkey"
            columns: ["equipo_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_fos_tac_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_fos_tac_usuario_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      analisis_laboratorio: {
        Row: {
          certificado_analisis_url: string | null
          created_at: string | null
          detalle_ingreso_sustrato_id: number | null
          equipo_asociado_id: number | null
          es_analisis_interno: boolean | null
          fecha_hora_muestra: string | null
          fecha_hora_registro: string
          id: number
          laboratorio_externo: string | null
          numero_muestra: string | null
          numero_remito_asociado: string | null
          observaciones: string | null
          peso_muestra_g: number | null
          planta_id: number
          temperatura_muestra_c: number | null
          tiempo_analisis_segundos: number | null
          tipo_muestra_id: number | null
          updated_at: string | null
          usuario_analista_id: number
        }
        Insert: {
          certificado_analisis_url?: string | null
          created_at?: string | null
          detalle_ingreso_sustrato_id?: number | null
          equipo_asociado_id?: number | null
          es_analisis_interno?: boolean | null
          fecha_hora_muestra?: string | null
          fecha_hora_registro: string
          id?: number
          laboratorio_externo?: string | null
          numero_muestra?: string | null
          numero_remito_asociado?: string | null
          observaciones?: string | null
          peso_muestra_g?: number | null
          planta_id: number
          temperatura_muestra_c?: number | null
          tiempo_analisis_segundos?: number | null
          tipo_muestra_id?: number | null
          updated_at?: string | null
          usuario_analista_id: number
        }
        Update: {
          certificado_analisis_url?: string | null
          created_at?: string | null
          detalle_ingreso_sustrato_id?: number | null
          equipo_asociado_id?: number | null
          es_analisis_interno?: boolean | null
          fecha_hora_muestra?: string | null
          fecha_hora_registro?: string
          id?: number
          laboratorio_externo?: string | null
          numero_muestra?: string | null
          numero_remito_asociado?: string | null
          observaciones?: string | null
          peso_muestra_g?: number | null
          planta_id?: number
          temperatura_muestra_c?: number | null
          tiempo_analisis_segundos?: number | null
          tipo_muestra_id?: number | null
          updated_at?: string | null
          usuario_analista_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "analisis_laboratorio_detalle_fkey"
            columns: ["detalle_ingreso_sustrato_id"]
            referencedRelation: "detalle_ingreso_sustrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_laboratorio_equipo_fkey"
            columns: ["equipo_asociado_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_laboratorio_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_laboratorio_tipo_muestra_fkey"
            columns: ["tipo_muestra_id"]
            referencedRelation: "tipos_muestra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_laboratorio_usuario_fkey"
            columns: ["usuario_analista_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      analisis_laboratorio_detalle: {
        Row: {
          analisis_laboratorio_id: number
          created_at: string | null
          id: number
          limite_inferior: number | null
          limite_superior: number | null
          metodo_analisis: string | null
          numero_replica: number | null
          observaciones_parametro: string | null
          parametro: string
          unidad: string | null
          valor: number | null
        }
        Insert: {
          analisis_laboratorio_id: number
          created_at?: string | null
          id?: number
          limite_inferior?: number | null
          limite_superior?: number | null
          metodo_analisis?: string | null
          numero_replica?: number | null
          observaciones_parametro?: string | null
          parametro: string
          unidad?: string | null
          valor?: number | null
        }
        Update: {
          analisis_laboratorio_id?: number
          created_at?: string | null
          id?: number
          limite_inferior?: number | null
          limite_superior?: number | null
          metodo_analisis?: string | null
          numero_replica?: number | null
          observaciones_parametro?: string | null
          parametro?: string
          unidad?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_laboratorio_detalle_analisis_fkey"
            columns: ["analisis_laboratorio_id"]
            referencedRelation: "analisis_laboratorio"
            referencedColumns: ["id"]
          }
        ]
      }
      areas_planta: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre_area: string
          orden_visualizacion: number | null
          planta_id: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_area: string
          orden_visualizacion?: number | null
          planta_id: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_area?: string
          orden_visualizacion?: number | null
          planta_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_planta_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          }
        ]
      }
      asignarempresa: {
        Row: {
          activo: boolean | null
          fecha_asignacion: string | null
          id: number
          id_empresa: number
          id_usuario: number | null
        }
        Insert: {
          activo?: boolean | null
          fecha_asignacion?: string | null
          id?: number
          id_empresa: number
          id_usuario?: number | null
        }
        Update: {
          activo?: boolean | null
          fecha_asignacion?: string | null
          id?: number
          id_empresa?: number
          id_usuario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asignarempresa_id_empresa_fkey"
            columns: ["id_empresa"]
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignarempresa_id_usuario_fkey"
            columns: ["id_usuario"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      cambios_potencia_chp: {
        Row: {
          created_at: string | null
          fecha_hora: string
          id: number
          motivo_cambio: string
          observaciones: string | null
          planta_id: number
          potencia_inicial_kw: number
          potencia_programada_kw: number
          updated_at: string | null
          usuario_operador_id: number
        }
        Insert: {
          created_at?: string | null
          fecha_hora: string
          id?: number
          motivo_cambio: string
          observaciones?: string | null
          planta_id: number
          potencia_inicial_kw: number
          potencia_programada_kw: number
          updated_at?: string | null
          usuario_operador_id: number
        }
        Update: {
          created_at?: string | null
          fecha_hora?: string
          id?: number
          motivo_cambio?: string
          observaciones?: string | null
          planta_id?: number
          potencia_inicial_kw?: number
          potencia_programada_kw?: number
          updated_at?: string | null
          usuario_operador_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cambios_potencia_chp_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_potencia_chp_usuario_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      camiones: {
        Row: {
          activo: boolean | null
          año: number | null
          capacidad_kg: number | null
          capacidad_m3: number | null
          created_at: string | null
          id: number
          marca: string | null
          modelo: string | null
          observaciones: string | null
          patente: string
          tipo_camion: string | null
          transportista_empresa_id: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          año?: number | null
          capacidad_kg?: number | null
          capacidad_m3?: number | null
          created_at?: string | null
          id?: number
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          patente: string
          tipo_camion?: string | null
          transportista_empresa_id: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          año?: number | null
          capacidad_kg?: number | null
          capacidad_m3?: number | null
          created_at?: string | null
          id?: number
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          patente?: string
          tipo_camion?: string | null
          transportista_empresa_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camiones_transportista_fkey"
            columns: ["transportista_empresa_id"]
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          }
        ]
      }
      categorias_repuestos: {
        Row: {
          activo: boolean | null
          codigo_categoria: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre_categoria: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo_categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_categoria: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo_categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_categoria?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          activo: boolean | null
          created_at: string | null
          criticidad: number | null
          descripcion_item: string
          es_valor_numerico: boolean | null
          frecuencia_verificacion: string | null
          id: number
          instrucciones_verificacion: string | null
          numero_item: string
          subsistema_id: number | null
          tipo_condicion: string
          unidad_medida: string | null
          updated_at: string | null
          valor_estandar: string | null
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          criticidad?: number | null
          descripcion_item: string
          es_valor_numerico?: boolean | null
          frecuencia_verificacion?: string | null
          id?: number
          instrucciones_verificacion?: string | null
          numero_item: string
          subsistema_id?: number | null
          tipo_condicion: string
          unidad_medida?: string | null
          updated_at?: string | null
          valor_estandar?: string | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          criticidad?: number | null
          descripcion_item?: string
          es_valor_numerico?: boolean | null
          frecuencia_verificacion?: string | null
          id?: number
          instrucciones_verificacion?: string | null
          numero_item?: string
          subsistema_id?: number | null
          tipo_condicion?: string
          unidad_medida?: string | null
          updated_at?: string | null
          valor_estandar?: string | null
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_subsistema_fkey"
            columns: ["subsistema_id"]
            referencedRelation: "subsistemas"
            referencedColumns: ["id"]
          }
        ]
      }
      checklist_registros: {
        Row: {
          accion_realizada: string | null
          checklist_item_id: number
          created_at: string | null
          estado_verificacion: string
          fecha_verificacion: string
          foto_evidencia_url: string | null
          hora_verificacion: string | null
          id: number
          observaciones: string | null
          requiere_accion: boolean | null
          tiempo_verificacion_minutos: number | null
          updated_at: string | null
          usuario_operador_id: number
          valor_medido: string | null
        }
        Insert: {
          accion_realizada?: string | null
          checklist_item_id: number
          created_at?: string | null
          estado_verificacion: string
          fecha_verificacion: string
          foto_evidencia_url?: string | null
          hora_verificacion?: string | null
          id?: number
          observaciones?: string | null
          requiere_accion?: boolean | null
          tiempo_verificacion_minutos?: number | null
          updated_at?: string | null
          usuario_operador_id: number
          valor_medido?: string | null
        }
        Update: {
          accion_realizada?: string | null
          checklist_item_id?: number
          created_at?: string | null
          estado_verificacion?: string
          fecha_verificacion?: string
          foto_evidencia_url?: string | null
          hora_verificacion?: string | null
          id?: number
          observaciones?: string | null
          requiere_accion?: boolean | null
          tiempo_verificacion_minutos?: number | null
          updated_at?: string | null
          usuario_operador_id?: number
          valor_medido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_registros_item_fkey"
            columns: ["checklist_item_id"]
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_registros_usuario_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      detalle_ingreso_sustrato: {
        Row: {
          calidad_visual: string | null
          cantidad_kg: number
          created_at: string | null
          id: number
          id_viaje_ingreso_fk: number
          lugar_descarga_id: number
          observaciones: string | null
          proveedor_empresa_id: number
          sustrato_id: number
          updated_at: string | null
        }
        Insert: {
          calidad_visual?: string | null
          cantidad_kg: number
          created_at?: string | null
          id?: number
          id_viaje_ingreso_fk: number
          lugar_descarga_id: number
          observaciones?: string | null
          proveedor_empresa_id: number
          sustrato_id: number
          updated_at?: string | null
        }
        Update: {
          calidad_visual?: string | null
          cantidad_kg?: number
          created_at?: string | null
          id?: number
          id_viaje_ingreso_fk?: number
          lugar_descarga_id?: number
          observaciones?: string | null
          proveedor_empresa_id?: number
          sustrato_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_ingreso_sustrato_lugar_fkey"
            columns: ["lugar_descarga_id"]
            referencedRelation: "lugares_descarga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_ingreso_sustrato_proveedor_fkey"
            columns: ["proveedor_empresa_id"]
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_ingreso_sustrato_sustrato_fkey"
            columns: ["sustrato_id"]
            referencedRelation: "sustratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_ingreso_sustrato_viaje_fkey"
            columns: ["id_viaje_ingreso_fk"]
            referencedRelation: "ingresos_viaje_camion"
            referencedColumns: ["id"]
          }
        ]
      }
      direcciones: {
        Row: {
          activo: boolean | null
          calle: string | null
          codigo_postal: string | null
          coordenadas: unknown | null
          created_at: string | null
          departamento: string | null
          id: number
          localidad: string | null
          numero: string | null
          observaciones: string | null
          pais: string | null
          piso: string | null
          provincia: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          calle?: string | null
          codigo_postal?: string | null
          coordenadas?: unknown | null
          created_at?: string | null
          departamento?: string | null
          id?: number
          localidad?: string | null
          numero?: string | null
          observaciones?: string | null
          pais?: string | null
          piso?: string | null
          provincia?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          calle?: string | null
          codigo_postal?: string | null
          coordenadas?: unknown | null
          created_at?: string | null
          departamento?: string | null
          id?: number
          localidad?: string | null
          numero?: string | null
          observaciones?: string | null
          pais?: string | null
          piso?: string | null
          provincia?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empresa: {
        Row: {
          activo: boolean | null
          contacto_principal: string | null
          created_at: string | null
          cuit: string | null
          direccion_id: number | null
          email: string | null
          id: number
          id_empresa: number | null
          iduseradmin: number | null
          logo_url: string | null
          nombre: string
          observaciones: string | null
          razon_social: string | null
          rubro: string | null
          telefono: string | null
          tipo_empresa: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          contacto_principal?: string | null
          created_at?: string | null
          cuit?: string | null
          direccion_id?: number | null
          email?: string | null
          id?: number
          id_empresa?: number | null
          iduseradmin?: number | null
          logo_url?: string | null
          nombre: string
          observaciones?: string | null
          razon_social?: string | null
          rubro?: string | null
          telefono?: string | null
          tipo_empresa?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          contacto_principal?: string | null
          created_at?: string | null
          cuit?: string | null
          direccion_id?: number | null
          email?: string | null
          id?: number
          id_empresa?: number | null
          iduseradmin?: number | null
          logo_url?: string | null
          nombre?: string
          observaciones?: string | null
          razon_social?: string | null
          rubro?: string | null
          telefono?: string | null
          tipo_empresa?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_direccion_fkey"
            columns: ["direccion_id"]
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_id_empresa_fkey"
            columns: ["id_empresa"]
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_iduseradmin_fkey"
            columns: ["iduseradmin"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      energia: {
        Row: {
          autoconsumo_porcentaje: number | null
          consumo_mwh: number | null
          created_at: string | null
          despacho_ren2_kwh_dia: number | null
          despacho_spot_smec_kwh_dia: number | null
          disponibilidad_motor_hs_dia: number | null
          eficiencia_planta_porcentaje: number | null
          fecha: string
          flujo_biogas_kg_dia: number | null
          generacion_electrica_total_kwh_dia: number | null
          horas_funcionamiento_motor_chp_dia: number | null
          id: number
          observaciones: string | null
          planta_id: number
          tiempo_funcionamiento_antorcha_s_dia: number | null
          totalizador_biogas_kg: number | null
          totalizador_chp_mwh: number | null
          totalizador_smec_kwh: number | null
          updated_at: string | null
        }
        Insert: {
          autoconsumo_porcentaje?: number | null
          consumo_mwh?: number | null
          created_at?: string | null
          despacho_ren2_kwh_dia?: number | null
          despacho_spot_smec_kwh_dia?: number | null
          disponibilidad_motor_hs_dia?: number | null
          eficiencia_planta_porcentaje?: number | null
          fecha: string
          flujo_biogas_kg_dia?: number | null
          generacion_electrica_total_kwh_dia?: number | null
          horas_funcionamiento_motor_chp_dia?: number | null
          id?: number
          observaciones?: string | null
          planta_id: number
          tiempo_funcionamiento_antorcha_s_dia?: number | null
          totalizador_biogas_kg?: number | null
          totalizador_chp_mwh?: number | null
          totalizador_smec_kwh?: number | null
          updated_at?: string | null
        }
        Update: {
          autoconsumo_porcentaje?: number | null
          consumo_mwh?: number | null
          created_at?: string | null
          despacho_ren2_kwh_dia?: number | null
          despacho_spot_smec_kwh_dia?: number | null
          disponibilidad_motor_hs_dia?: number | null
          eficiencia_planta_porcentaje?: number | null
          fecha?: string
          flujo_biogas_kg_dia?: number | null
          generacion_electrica_total_kwh_dia?: number | null
          horas_funcionamiento_motor_chp_dia?: number | null
          id?: number
          observaciones?: string | null
          planta_id?: number
          tiempo_funcionamiento_antorcha_s_dia?: number | null
          totalizador_biogas_kg?: number | null
          totalizador_chp_mwh?: number | null
          totalizador_smec_kwh?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energia_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          }
        ]
      }
      equipos: {
        Row: {
          activo: boolean | null
          categoria: string | null
          codigo_equipo: string | null
          created_at: string | null
          especificaciones_tecnicas: Json | null
          estado: Database["public"]["Enums"]["estado_equipo_enum"] | null
          fecha_instalacion: string | null
          fecha_ultimo_mantenimiento: string | null
          id: number
          marca: string | null
          modelo: string | null
          nombre_equipo: string
          numero_serie: string | null
          planta_id: number
          proximo_mantenimiento: string | null
          subsistema_id: number | null
          tipo_inspeccion: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          codigo_equipo?: string | null
          created_at?: string | null
          especificaciones_tecnicas?: Json | null
          estado?: Database["public"]["Enums"]["estado_equipo_enum"] | null
          fecha_instalacion?: string | null
          fecha_ultimo_mantenimiento?: string | null
          id?: number
          marca?: string | null
          modelo?: string | null
          nombre_equipo: string
          numero_serie?: string | null
          planta_id: number
          proximo_mantenimiento?: string | null
          subsistema_id?: number | null
          tipo_inspeccion?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          codigo_equipo?: string | null
          created_at?: string | null
          especificaciones_tecnicas?: Json | null
          estado?: Database["public"]["Enums"]["estado_equipo_enum"] | null
          fecha_instalacion?: string | null
          fecha_ultimo_mantenimiento?: string | null
          id?: number
          marca?: string | null
          modelo?: string | null
          nombre_equipo?: string
          numero_serie?: string | null
          planta_id?: number
          proximo_mantenimiento?: string | null
          subsistema_id?: number | null
          tipo_inspeccion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipos_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_subsistema_fkey"
            columns: ["subsistema_id"]
            referencedRelation: "subsistemas"
            referencedColumns: ["id"]
          }
        ]
      }
      ingresos_viaje_camion: {
        Row: {
          camion_id: number
          chofer_usuario_id: number | null
          created_at: string | null
          fecha_hora_ingreso: string
          id: number
          numero_remito_general: string | null
          observaciones_viaje: string | null
          peso_bruto_kg: number | null
          peso_neto_kg: number | null
          peso_tara_kg: number | null
          planta_id: number
          updated_at: string | null
          usuario_operador_id: number
        }
        Insert: {
          camion_id: number
          chofer_usuario_id?: number | null
          created_at?: string | null
          fecha_hora_ingreso: string
          id?: number
          numero_remito_general?: string | null
          observaciones_viaje?: string | null
          peso_bruto_kg?: number | null
          peso_neto_kg?: number | null
          peso_tara_kg?: number | null
          planta_id: number
          updated_at?: string | null
          usuario_operador_id: number
        }
        Update: {
          camion_id?: number
          chofer_usuario_id?: number | null
          created_at?: string | null
          fecha_hora_ingreso?: string
          id?: number
          numero_remito_general?: string | null
          observaciones_viaje?: string | null
          peso_bruto_kg?: number | null
          peso_neto_kg?: number | null
          peso_tara_kg?: number | null
          planta_id?: number
          updated_at?: string | null
          usuario_operador_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingresos_viaje_camion_camion_fkey"
            columns: ["camion_id"]
            referencedRelation: "camiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_viaje_camion_chofer_fkey"
            columns: ["chofer_usuario_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_viaje_camion_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_viaje_camion_usuario_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      lecturas_gas: {
        Row: {
          caudal_chp_ls: number | null
          caudal_masico_scada_kgh: number | null
          ch4_porcentaje: number | null
          co2_porcentaje: number | null
          created_at: string | null
          equipo_id_fk: number
          fecha_hora: string
          fuente: string
          h2s_ppm: number | null
          id: number
          o2_porcentaje: number | null
          observaciones: string | null
          planta_id: number
          potencia_exacta_kw: number | null
          presion_mbar: number | null
          temperatura_c: number | null
          updated_at: string | null
          usuario_operador_id_fk: number
        }
        Insert: {
          caudal_chp_ls?: number | null
          caudal_masico_scada_kgh?: number | null
          ch4_porcentaje?: number | null
          co2_porcentaje?: number | null
          created_at?: string | null
          equipo_id_fk: number
          fecha_hora: string
          fuente?: string
          h2s_ppm?: number | null
          id?: number
          o2_porcentaje?: number | null
          observaciones?: string | null
          planta_id: number
          potencia_exacta_kw?: number | null
          presion_mbar?: number | null
          temperatura_c?: number | null
          updated_at?: string | null
          usuario_operador_id_fk: number
        }
        Update: {
          caudal_chp_ls?: number | null
          caudal_masico_scada_kgh?: number | null
          ch4_porcentaje?: number | null
          co2_porcentaje?: number | null
          created_at?: string | null
          equipo_id_fk?: number
          fecha_hora?: string
          fuente?: string
          h2s_ppm?: number | null
          id?: number
          o2_porcentaje?: number | null
          observaciones?: string | null
          planta_id?: number
          potencia_exacta_kw?: number | null
          presion_mbar?: number | null
          temperatura_c?: number | null
          updated_at?: string | null
          usuario_operador_id_fk?: number
        }
        Relationships: [
          {
            foreignKeyName: "lecturas_gas_equipo_fkey"
            columns: ["equipo_id_fk"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecturas_gas_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecturas_gas_usuario_fkey"
            columns: ["usuario_operador_id_fk"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      lugares_descarga: {
        Row: {
          activo: boolean | null
          capacidad_m3: number | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
          planta_id: number
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          capacidad_m3?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
          planta_id: number
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          capacidad_m3?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
          planta_id?: number
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lugares_descarga_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          }
        ]
      }
      mantenimiento_eventos: {
        Row: {
          created_at: string | null
          descripcion_problema: string | null
          descripcion_trabajo_realizado: string | null
          efectividad: string | null
          equipo_id: number
          fecha_fin: string | null
          fecha_inicio: string
          fecha_planificada: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: number
          observaciones: string | null
          planta_id: number
          requiere_seguimiento: boolean | null
          tiempo_inactividad_equipo_horas: number | null
          tipo_mantenimiento_id: number
          updated_at: string | null
          usuario_responsable_id: number | null
        }
        Insert: {
          created_at?: string | null
          descripcion_problema?: string | null
          descripcion_trabajo_realizado?: string | null
          efectividad?: string | null
          equipo_id: number
          fecha_fin?: string | null
          fecha_inicio: string
          fecha_planificada?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          observaciones?: string | null
          planta_id: number
          requiere_seguimiento?: boolean | null
          tiempo_inactividad_equipo_horas?: number | null
          tipo_mantenimiento_id: number
          updated_at?: string | null
          usuario_responsable_id?: number | null
        }
        Update: {
          created_at?: string | null
          descripcion_problema?: string | null
          descripcion_trabajo_realizado?: string | null
          efectividad?: string | null
          equipo_id?: number
          fecha_fin?: string | null
          fecha_inicio?: string
          fecha_planificada?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          observaciones?: string | null
          planta_id?: number
          requiere_seguimiento?: boolean | null
          tiempo_inactividad_equipo_horas?: number | null
          tipo_mantenimiento_id?: number
          updated_at?: string | null
          usuario_responsable_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mantenimiento_eventos_equipo_fkey"
            columns: ["equipo_id"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimiento_eventos_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimiento_eventos_tipo_fkey"
            columns: ["tipo_mantenimiento_id"]
            referencedRelation: "tipos_mantenimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimiento_eventos_usuario_fkey"
            columns: ["usuario_responsable_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      modulos: {
        Row: {
          "check": boolean | null
          activo: boolean | null
          descripcion: string | null
          icono: string | null
          id: number
          nombre: string
          orden: number | null
        }
        Insert: {
          "check"?: boolean | null
          activo?: boolean | null
          descripcion?: string | null
          icono?: string | null
          id?: number
          nombre: string
          orden?: number | null
        }
        Update: {
          "check"?: boolean | null
          activo?: boolean | null
          descripcion?: string | null
          icono?: string | null
          id?: number
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      monitoreos_ambientales: {
        Row: {
          condiciones_climaticas: string | null
          created_at: string | null
          direccion_punto_id: number | null
          fecha_monitoreo: string
          hora_monitoreo: string | null
          id: number
          laboratorio_analisis: string | null
          numero_certificado: string | null
          observaciones: string | null
          planta_id: number
          punto_medicion: string | null
          tipo_monitoreo: string
          updated_at: string | null
          usuario_operador_id: number | null
        }
        Insert: {
          condiciones_climaticas?: string | null
          created_at?: string | null
          direccion_punto_id?: number | null
          fecha_monitoreo: string
          hora_monitoreo?: string | null
          id?: number
          laboratorio_analisis?: string | null
          numero_certificado?: string | null
          observaciones?: string | null
          planta_id: number
          punto_medicion?: string | null
          tipo_monitoreo: string
          updated_at?: string | null
          usuario_operador_id?: number | null
        }
        Update: {
          condiciones_climaticas?: string | null
          created_at?: string | null
          direccion_punto_id?: number | null
          fecha_monitoreo?: string
          hora_monitoreo?: string | null
          id?: number
          laboratorio_analisis?: string | null
          numero_certificado?: string | null
          observaciones?: string | null
          planta_id?: number
          punto_medicion?: string | null
          tipo_monitoreo?: string
          updated_at?: string | null
          usuario_operador_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoreos_ambientales_direccion_punto_fkey"
            columns: ["direccion_punto_id"]
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoreos_ambientales_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoreos_ambientales_usuario_fkey"
            columns: ["usuario_operador_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      monitoreos_ambientales_detalle: {
        Row: {
          acciones_correctivas: string | null
          created_at: string | null
          cumple_normativa: boolean | null
          equipo_medicion: string | null
          id: number
          limite_normativo: number | null
          metodo_medicion: string | null
          monitoreo_id: number
          observaciones_parametro: string | null
          parametro_medido: string
          porcentaje_limite: number | null
          unidad_medida: string | null
          valor: number | null
        }
        Insert: {
          acciones_correctivas?: string | null
          created_at?: string | null
          cumple_normativa?: boolean | null
          equipo_medicion?: string | null
          id?: number
          limite_normativo?: number | null
          metodo_medicion?: string | null
          monitoreo_id: number
          observaciones_parametro?: string | null
          parametro_medido: string
          porcentaje_limite?: number | null
          unidad_medida?: string | null
          valor?: number | null
        }
        Update: {
          acciones_correctivas?: string | null
          created_at?: string | null
          cumple_normativa?: boolean | null
          equipo_medicion?: string | null
          id?: number
          limite_normativo?: number | null
          metodo_medicion?: string | null
          monitoreo_id?: number
          observaciones_parametro?: string | null
          parametro_medido?: string
          porcentaje_limite?: number | null
          unidad_medida?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoreos_ambientales_detalle_monitoreo_fkey"
            columns: ["monitoreo_id"]
            referencedRelation: "monitoreos_ambientales"
            referencedColumns: ["id"]
          }
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          created_at: string | null
          fecha_movimiento: string | null
          id: number
          mantenimiento_evento_id: number | null
          motivo: string
          numero_documento: string | null
          observaciones: string | null
          planta_id: number
          repuesto_id: number
          tipo_movimiento: string
          usuario_responsable_id: number | null
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          fecha_movimiento?: string | null
          id?: number
          mantenimiento_evento_id?: number | null
          motivo: string
          numero_documento?: string | null
          observaciones?: string | null
          planta_id: number
          repuesto_id: number
          tipo_movimiento: string
          usuario_responsable_id?: number | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          fecha_movimiento?: string | null
          id?: number
          mantenimiento_evento_id?: number | null
          motivo?: string
          numero_documento?: string | null
          observaciones?: string | null
          planta_id?: number
          repuesto_id?: number
          tipo_movimiento?: string
          usuario_responsable_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_mantenimiento_fkey"
            columns: ["mantenimiento_evento_id"]
            referencedRelation: "mantenimiento_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_repuesto_fkey"
            columns: ["repuesto_id"]
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_usuario_fkey"
            columns: ["usuario_responsable_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      permisos: {
        Row: {
          activo: boolean | null
          fecha_asignacion: string | null
          id: number
          id_usuario: number
          idmodulo: number | null
          vista_path: string | null
        }
        Insert: {
          activo?: boolean | null
          fecha_asignacion?: string | null
          id?: number
          id_usuario: number
          idmodulo?: number | null
          vista_path?: string | null
        }
        Update: {
          activo?: boolean | null
          fecha_asignacion?: string | null
          id?: number
          id_usuario?: number
          idmodulo?: number | null
          vista_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permisos_id_usuario_fkey"
            columns: ["id_usuario"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_idmodulo_fkey"
            columns: ["idmodulo"]
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          }
        ]
      }
      pfq: {
        Row: {
          conductividad_ms_cm: number | null
          created_at: string | null
          equipo_id_fk: number
          fecha_hora_medicion: string
          id: number
          nivel_m: number | null
          observaciones: string | null
          planta_id: number
          solidos_totales_mg_l: number | null
          temperatura_c: number | null
          updated_at: string | null
          usuario_operador_id_fk: number
        }
        Insert: {
          conductividad_ms_cm?: number | null
          created_at?: string | null
          equipo_id_fk: number
          fecha_hora_medicion: string
          id?: number
          nivel_m?: number | null
          observaciones?: string | null
          planta_id: number
          solidos_totales_mg_l?: number | null
          temperatura_c?: number | null
          updated_at?: string | null
          usuario_operador_id_fk: number
        }
        Update: {
          conductividad_ms_cm?: number | null
          created_at?: string | null
          equipo_id_fk?: number
          fecha_hora_medicion?: string
          id?: number
          nivel_m?: number | null
          observaciones?: string | null
          planta_id?: number
          solidos_totales_mg_l?: number | null
          temperatura_c?: number | null
          updated_at?: string | null
          usuario_operador_id_fk?: number
        }
        Relationships: [
          {
            foreignKeyName: "pfq_equipo_fkey"
            columns: ["equipo_id_fk"]
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pfq_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pfq_usuario_fkey"
            columns: ["usuario_operador_id_fk"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      plantas: {
        Row: {
          activo: boolean | null
          configuracion: Json | null
          created_at: string | null
          direccion_id: number | null
          id: number
          id_empresa: number
          nombre_planta: string
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          configuracion?: Json | null
          created_at?: string | null
          direccion_id?: number | null
          id?: number
          id_empresa: number
          nombre_planta: string
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          configuracion?: Json | null
          created_at?: string | null
          direccion_id?: number | null
          id?: number
          id_empresa?: number
          nombre_planta?: string
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantas_direccion_fkey"
            columns: ["direccion_id"]
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantas_id_empresa_fkey"
            columns: ["id_empresa"]
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          }
        ]
      }
      repuestos: {
        Row: {
          activo: boolean | null
          categoria: string | null
          categoria_repuesto_id: number | null
          codigo_interno: string | null
          codigo_sku: string | null
          created_at: string | null
          descripcion: string | null
          equipos_compatibles: number[] | null
          id: number
          marca_fabricante: string | null
          nombre_repuesto: string
          numero_parte_fabricante: string | null
          planta_id: number
          proveedor_principal_empresa_id: number | null
          punto_reorden: number | null
          requiere_importacion: boolean | null
          stock_actual: number
          stock_maximo: number | null
          stock_minimo: number | null
          subsistemas_aplicables: number[] | null
          tiempo_entrega_dias: number | null
          ubicacion_almacen: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          categoria_repuesto_id?: number | null
          codigo_interno?: string | null
          codigo_sku?: string | null
          created_at?: string | null
          descripcion?: string | null
          equipos_compatibles?: number[] | null
          id?: number
          marca_fabricante?: string | null
          nombre_repuesto: string
          numero_parte_fabricante?: string | null
          planta_id: number
          proveedor_principal_empresa_id?: number | null
          punto_reorden?: number | null
          requiere_importacion?: boolean | null
          stock_actual?: number
          stock_maximo?: number | null
          stock_minimo?: number | null
          subsistemas_aplicables?: number[] | null
          tiempo_entrega_dias?: number | null
          ubicacion_almacen?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          categoria_repuesto_id?: number | null
          codigo_interno?: string | null
          codigo_sku?: string | null
          created_at?: string | null
          descripcion?: string | null
          equipos_compatibles?: number[] | null
          id?: number
          marca_fabricante?: string | null
          nombre_repuesto?: string
          numero_parte_fabricante?: string | null
          planta_id?: number
          proveedor_principal_empresa_id?: number | null
          punto_reorden?: number | null
          requiere_importacion?: boolean | null
          stock_actual?: number
          stock_maximo?: number | null
          stock_minimo?: number | null
          subsistemas_aplicables?: number[] | null
          tiempo_entrega_dias?: number | null
          ubicacion_almacen?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_categoria_fkey"
            columns: ["categoria_repuesto_id"]
            referencedRelation: "categorias_repuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_proveedor_principal_fkey"
            columns: ["proveedor_principal_empresa_id"]
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          }
        ]
      }
      subsistemas: {
        Row: {
          activo: boolean | null
          area_id: number
          codigo_subsistema: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre_subsistema: string
          orden_visualizacion: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          area_id: number
          codigo_subsistema?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_subsistema: string
          orden_visualizacion?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          area_id?: number
          codigo_subsistema?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_subsistema?: string
          orden_visualizacion?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsistemas_area_fkey"
            columns: ["area_id"]
            referencedRelation: "areas_planta"
            referencedColumns: ["id"]
          }
        ]
      }
      sustratos: {
        Row: {
          activo: boolean | null
          categoria: string | null
          contenido_st_porcentaje: number | null
          created_at: string | null
          densidad_kg_m3: number | null
          descripcion: string | null
          id: number
          nombre: string
          ph_promedio: number | null
          planta_id: number | null
          potencial_biogas_m3_ton: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          contenido_st_porcentaje?: number | null
          created_at?: string | null
          densidad_kg_m3?: number | null
          descripcion?: string | null
          id?: number
          nombre: string
          ph_promedio?: number | null
          planta_id?: number | null
          potencial_biogas_m3_ton?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          contenido_st_porcentaje?: number | null
          created_at?: string | null
          densidad_kg_m3?: number | null
          descripcion?: string | null
          id?: number
          nombre?: string
          ph_promedio?: number | null
          planta_id?: number | null
          potencial_biogas_m3_ton?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sustratos_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          }
        ]
      }
      tareas_mantenimiento: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          equipo_categoria: string | null
          frecuencia: Database["public"]["Enums"]["frecuencia_enum"] | null
          herramientas_necesarias: string[] | null
          id: number
          nombre_tarea: string
          planta_id: number
          prioridad: number | null
          procedimiento: string | null
          repuestos_frecuentes: number[] | null
          requiere_especialista: boolean | null
          tiempo_estimado_minutos: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          equipo_categoria?: string | null
          frecuencia?: Database["public"]["Enums"]["frecuencia_enum"] | null
          herramientas_necesarias?: string[] | null
          id?: number
          nombre_tarea: string
          planta_id: number
          prioridad?: number | null
          procedimiento?: string | null
          repuestos_frecuentes?: number[] | null
          requiere_especialista?: boolean | null
          tiempo_estimado_minutos?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          equipo_categoria?: string | null
          frecuencia?: Database["public"]["Enums"]["frecuencia_enum"] | null
          herramientas_necesarias?: string[] | null
          id?: number
          nombre_tarea?: string
          planta_id?: number
          prioridad?: number | null
          procedimiento?: string | null
          repuestos_frecuentes?: number[] | null
          requiere_especialista?: boolean | null
          tiempo_estimado_minutos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_mantenimiento_planta_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          }
        ]
      }
      tipos_alarma: {
        Row: {
          activo: boolean | null
          categoria_alarma: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre_alarma: string
          procedimiento_respuesta: string | null
          requiere_accion_inmediata: boolean | null
          severidad_default:
            | Database["public"]["Enums"]["severidad_enum"]
            | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_alarma?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_alarma: string
          procedimiento_respuesta?: string | null
          requiere_accion_inmediata?: boolean | null
          severidad_default?:
            | Database["public"]["Enums"]["severidad_enum"]
            | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_alarma?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_alarma?: string
          procedimiento_respuesta?: string | null
          requiere_accion_inmediata?: boolean | null
          severidad_default?:
            | Database["public"]["Enums"]["severidad_enum"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tipos_mantenimiento: {
        Row: {
          activo: boolean | null
          categoria: string | null
          color_codigo: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre_tipo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          color_codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_tipo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          color_codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tipos_muestra: {
        Row: {
          activo: boolean | null
          categoria: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre_tipo_muestra: string
          parametros_standard: string[] | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_tipo_muestra: string
          parametros_standard?: string[] | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre_tipo_muestra?: string
          parametros_standard?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          color_fondo: string | null
          correo: string | null
          created_at: string | null
          direccion_id: number | null
          estado: string | null
          fecharegistro: string
          foto_url: string | null
          id: number
          idauth: string
          idioma: string | null
          nombres: string
          notificaciones_email: boolean | null
          notificaciones_push: boolean | null
          nro_doc: string | null
          telefono: string | null
          tipodoc: string | null
          tipouser: string
          updated_at: string | null
          zona_horaria: string | null
        }
        Insert: {
          color_fondo?: string | null
          correo?: string | null
          created_at?: string | null
          direccion_id?: number | null
          estado?: string | null
          fecharegistro?: string
          foto_url?: string | null
          id?: number
          idauth: string
          idioma?: string | null
          nombres?: string
          notificaciones_email?: boolean | null
          notificaciones_push?: boolean | null
          nro_doc?: string | null
          telefono?: string | null
          tipodoc?: string | null
          tipouser: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Update: {
          color_fondo?: string | null
          correo?: string | null
          created_at?: string | null
          direccion_id?: number | null
          estado?: string | null
          fecharegistro?: string
          foto_url?: string | null
          id?: number
          idauth?: string
          idioma?: string | null
          nombres?: string
          notificaciones_email?: boolean | null
          notificaciones_push?: boolean | null
          nro_doc?: string | null
          telefono?: string | null
          tipodoc?: string | null
          tipouser?: string
          updated_at?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_direccion_fkey"
            columns: ["direccion_id"]
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          }
        ]
      }
      usuarios_plantas: {
        Row: {
          created_at: string
          id: number
          planta_id: number
          rol: string
          usuario_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          planta_id: number
          rol?: string
          usuario_id: number
        }
        Update: {
          created_at?: string
          id?: number
          planta_id?: number
          rol?: string
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_plantas_planta_id_fkey"
            columns: ["planta_id"]
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_plantas_usuario_id_fkey"
            columns: ["usuario_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_equipo_enum: "operativo" | "mantenimiento" | "fuera_servicio"
      frecuencia_enum: "diaria" | "semanal" | "mensual"
      severidad_enum: "info" | "warning" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
