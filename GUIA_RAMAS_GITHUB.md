# Guía de Trabajo con Ramas en GitHub

El uso de ramas (branches) te permite desarrollar nuevas funcionalidades, corregir errores o realizar experimentos sin afectar la versión estable de tu proyecto. Aquí tienes una guía sobre cómo gestionar tu flujo de trabajo de manera efectiva.

## 1. Conceptos Básicos

*   **main (o master):** Es la rama principal. Contiene el código de producción, estable y listo para desplegar. **Nunca** debes trabajar directamente aquí.
*   **develop (opcional):** Una rama de integración donde se unen las nuevas funcionalidades antes de pasar a `main`.
*   **feature branches (ramas de funcionalidad):** Ramas temporales donde desarrollas una tarea específica (ej. `feature/filtro-gantt`, `fix/error-login`).

## 2. Flujo de Trabajo Recomendado

El ciclo de vida estándar para desarrollar una nueva tarea es el siguiente:

### Paso 1: Asegúrate de estar actualizado
Antes de crear una nueva rama, asegúrate de tener la última versión de `main`.

```bash
git checkout main
git pull origin main
```

### Paso 2: Crea una nueva rama
Crea una rama específica para lo que vas a hacer. Usa nombres descriptivos.

**Convención de nombres:**
*   `feature/nombre-funcionalidad` (para nuevas funciones)
*   `fix/nombre-correccion` (para arreglar errores)
*   `chore/nombre-tarea` (para mantenimiento, limpieza, etc.)

**Ejemplo:**
```bash
git checkout -b feature/filtro-gantt-presentacion
```
*(El comando `-b` crea la rama y te mueve a ella automáticamente).*

### Paso 3: Trabaja y haz Commits
Realiza tus cambios en el código. A medida que avanzas, guarda tu progreso.

```bash
git add .
git commit -m "Implementado botón de modo presentación"
```

Si haces más cambios:
```bash
git add .
git commit -m "Ocultados filtros al activar modo presentación"
```

### Paso 4: Sube tu rama a GitHub (Push)
Para guardar tu rama en el servidor y compartirla (o para crear un Pull Request).

```bash
git push -u origin feature/filtro-gantt-presentacion
```
*(La opción `-u` vincula tu rama local con la remota).*

### Paso 5: Fusionar cambios (Merge)
Una vez que has terminado y verificado que todo funciona, integra tus cambios en `main`.

1.  Vuelve a la rama principal:
    ```bash
    git checkout main
    ```
2.  Actualiza `main` por si hubo cambios mientras trabajabas:
    ```bash
    git pull origin main
    ```
3.  Fusiona tu rama:
    ```bash
    git merge feature/filtro-gantt-presentacion
    ```

### Paso 6: Limpieza
Una vez fusionada, puedes borrar la rama si ya no la necesitas.

**Borrar rama local:**
```bash
git branch -d feature/filtro-gantt-presentacion
```

**Borrar rama remota (GitHub):**
```bash
git push origin --delete feature/filtro-gantt-presentacion
```

## 3. Comandos Útiles

*   **Ver todas las ramas:** `git branch -a`
*   **Cambiar de rama:** `git checkout nombre-rama`
*   **Ver estado actual:** `git status`
*   **Descartar cambios en un archivo (antes de commit):** `git checkout -- nombre-archivo`

## 4. Ejemplo Práctico: Tu caso actual

Para la funcionalidad de "Quitar filtros Gantt en modo presentación", el flujo ideal hubiera sido:

1.  `git checkout main`
2.  `git checkout -b feature/gantt-presentacion`
3.  *Hacer los cambios en el código.*
4.  `git commit -m "Añadido modo presentación"`
5.  *Si te arrepientes o quieres probar otra cosa, simplemente vuelves a `main` y tu código sigue intacto.*

Si algo sale mal en la rama `feature`, puedes borrarla y volver a empezar sin haber "ensuciado" tu proyecto principal.
