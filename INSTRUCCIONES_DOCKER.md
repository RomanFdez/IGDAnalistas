# Guía de Mantenimiento y Despliegue con Docker

Esta guía detalla los pasos necesarios para actualizar, mantener y solucionar problemas de la aplicación "Imputaciones GD Analistas" desplegada en Docker.

## 1. Actualización de la Aplicación (Despliegue Estándar)

Cada vez que se suben cambios al repositorio GitHub, siga estos pasos en el servidor para aplicarlos:

### Paso 1: Acceder al directorio del proyecto
```bash
cd imputaciones-gd-mapfre
```

### Paso 2: Descargar los últimos cambios
```bash
git pull
```

### Paso 3: Limpieza preventiva (Recomendado)
Para evitar errores de "no space left on device", es recomendable limpiar imágenes antiguas y caché antes de construir.
```bash
docker system prune -f
```

### Paso 4: Reconstruir y Reiniciar
Este comando reconstruye la imagen con el nuevo código y reinicia los contenedores.
```bash
docker-compose up -d --build
```

---

## 2. Solución de Problemas Comunes

### Error: "no space left on device"
Si la construcción falla por falta de espacio:

1. **Limpieza General:**
   Borra contenedores detenidos, redes no usadas e imágenes colgantes.
   ```bash
   docker system prune -a
   ```
   *(Confirmar con 'y' cuando pregunte)*

2. **Limpieza de Volúmenes:**
   Si lo anterior no basta, borra volúmenes de datos huérfanos.
   ```bash
   docker volume prune
   ```

### El contenedor no arranca o da error
Para ver qué está pasando dentro del contenedor:

```bash
docker-compose logs -f app
```
*(Presione `Ctrl + C` para salir de los logs)*

---

## 3. Comandos Útiles de Referencia

| Acción | Comando |
|--------|---------|
| **Ver estado de contenedores** | `docker-compose ps` |
| **Parar la aplicación** | `docker-compose down` |
| **Reiniciar sin reconstruir** | `docker-compose restart app` |
| **Ver uso de disco Docker** | `docker system df` |
