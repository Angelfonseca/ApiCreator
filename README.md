# 🚀 Generador de APIs con IA  

Este proyecto es una aplicación web que permite generar APIs automáticamente en **JavaScript (Node.js)** o **TypeScript** con bases de datos **MongoDB** o **PostgreSQL**, utilizando IA.  

## 📌 Características principales  
✅ Generación automática de APIs basadas en un esquema JSON.  
✅ Selección de **lenguaje** de programación (**JavaScript o TypeScript**).  
✅ Selección de **base de datos** (**MongoDB o PostgreSQL**).  
✅ Descarga del proyecto en un archivo **.zip** listo para usar.  

---

## 📦 Instalación  

### 1️⃣ Clonar el repositorio  
```bash
git clone https://github.com/Angelfonseca/ApiCreator.git
cd ApiCreator
```

### 2️⃣ Instalar dependencias  
```bash
npm install
```

### 3️⃣ Iniciar el servidor  
```bash
npm start
```
⚡ Por defecto, la aplicación se ejecutará en [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Cómo usar la aplicación  
1. Ingresar el esquema JSON en la caja de texto.  
2. Seleccionar el lenguaje (JavaScript o TypeScript).  
3. Seleccionar la base de datos (MongoDB o PostgreSQL).  
4. Presionar el botón "Generar API".  
5. Se enviará el JSON al servidor y se descargará un archivo .zip con el código generado.

---

## 🔄 Endpoints disponibles  
| Método | Endpoint              | Descripción                              |
|--------|-----------------------|------------------------------------------|
| POST   | /api/generatemdbts    | Genera API en TypeScript con MongoDB     |
| POST   | /api/generatemdbjs    | Genera API en JavaScript con MongoDB     |
| POST   | /api/generatepgjs     | Genera API en JavaScript con PostgreSQL  |
| POST   | /api/generatepgts     | Genera API en TypeScript con PostgreSQL  |
| POST   | /api/ai               | Genera la conexión con IA para crear mo  |
                                   delos de datos basado en prompts
                                  

📌 Cada endpoint recibe un JSON con la estructura del esquema de la API y devuelve un archivo .zip.

---

## 🎨 Tecnologías utilizadas  
✅ Frontend: Bootstrap, JavaScript, HTML, CSS  
✅ Backend: Node.js, Express.js  
✅ Base de datos: MongoDB, PostgreSQL  
✅ Otros: Axios para enviar solicitudes al backend

---

## 📄 Ejemplo de JSON de entrada  
```json
{
    "name": "Usuarios",
    "fields": [
        { "name": "id", "type": "integer", "primaryKey": true },
        { "name": "nombre", "type": "string" },
        { "name": "email", "type": "string", "unique": true }
    ],
    "relations": [
        { "type": "one-to-many", "target": "Pedidos", "field": "usuarioId" }
    ]
}
```

---

## 📝 Licencia  
Este proyecto está bajo la GPL License.

---


