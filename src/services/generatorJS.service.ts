interface Field {
    name: string;
    type: string; 
    ref?: string;     
    fields?: Field[]; // Para objetos anidados
    items?: Field;    // Para arrays de objetos o tipos primitivos
}
const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};
const genJsModel = (name: string, fields: Field[]) => {
    let content = `const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n`;

    // Función para generar subesquemas si es necesario
    const generateSubSchema = (subFields: Field[]) => {
        let subSchemaContent = `new Schema({\n`;
        for (const field of subFields) {
            if (field.ref) {
                subSchemaContent += `    ${field.name}: { type: Schema.Types.ObjectId, ref: '${field.ref}' },\n`;
            } else if (field.type === 'Object') {
                // Verificar si el campo 'fields' existe
                if (!field.fields || !Array.isArray(field.fields)) {
                    throw new Error(`El campo 'fields' no está definido o no es un array para el objeto anidado en el campo '${field.name}'`);
                }
                subSchemaContent += `    ${field.name}: ${generateSubSchema(field.fields)},\n`;
            } else if (field.type === 'Array') {
                // Si es un array, verificar si contiene objetos
                if (field.items && field.items.type === 'Object' && field.items.fields) {
                    if (!Array.isArray(field.items.fields)) {
                        throw new Error(`El campo 'fields' no está definido o no es un array para el array de objetos en el campo '${field.name}'`);
                    }
                    const itemFields = field.items.fields as Field[];
                    subSchemaContent += `    ${field.name}: [${generateSubSchema(itemFields)}],\n`;
                } else if (field.items && field.items.type) {
                    subSchemaContent += `    ${field.name}: [{ type: ${capitalizeType(field.items.type)} }],\n`;
                } else {
                    throw new Error(`El campo 'items' no está definido o no tiene tipo para el array en el campo '${field.name}'`);
                }
            } else {
                subSchemaContent += `    ${field.name}: { type: ${capitalizeType(field.type)} },\n`;
            }
        }
        subSchemaContent += `})`;
        return subSchemaContent;
    };

    content += `const ${name}Schema = new Schema({\n`;

    for (const field of fields) {
        if (field.ref) {
            // Si tiene referencia (relación con otro modelo)
            content += `    ${field.name}: { type: Schema.Types.ObjectId, ref: '${field.ref}' },\n`;
        } else if (field.type === 'Object') {
            // Si es un objeto, generamos un subesquema
            if (!field.fields || !Array.isArray(field.fields)) {
                throw new Error(`El campo 'fields' no está definido o no es un array para el objeto anidado en el campo '${field.name}'`);
            }
            content += `    ${field.name}: ${generateSubSchema(field.fields)},\n`;
        } else if (field.type === 'Array') {
            // Si es un array, verificamos si contiene objetos
            if (field.items && field.items.type === 'Object') {
                if (!field.items.fields || !Array.isArray(field.items.fields)) {
                    throw new Error(`El campo 'fields' no está definido o no es un array para el array de objetos en el campo '${field.name}'`);
                }
                content += `    ${field.name}: [${generateSubSchema(field.items.fields)}],\n`;
            } else if (field.items && field.items.type) {
                content += `    ${field.name}: [{ type: ${capitalizeType(field.items.type)} }],\n`;
            } else {
                throw new Error(`El campo 'items' no está definido o no tiene tipo para el array en el campo '${field.name}'`);
            }
        } else {
            // Si no tiene referencia, solo el tipo
            content += `    ${field.name}: { type: ${capitalizeType(field.type)} },\n`;
        }
    }

    content += `}, { timestamps: true });\n\n`;
    content += `module.exports = mongoose.model('${name}', ${name}Schema);\n`;

    return content;
};
const genJsService = (name: string) => {
    let content = `const ${name} = require('../models/${name}.model');\n\n`;
    content += `const ${name}Service = {\n`;
    
    // Obtener todos los registros
    content += `    getAll: async () => {\n`;
    content += `        try {\n`;
    content += `            return await ${name}.find();\n`;
    content += `        } catch (error) {\n`;
    content += `            throw new Error('Error al obtener los datos: ' + error.message);\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Crear un nuevo registro
    content += `    create: async (data) => {\n`;
    content += `        try {\n`;
    content += `            const new${capitalizeType(name)} = new ${name}(data);\n`;
    content += `            return await new${capitalizeType(name)}.save();\n`;
    content += `        } catch (error) {\n`;
    content += `            throw new Error('Error al crear el registro: ' + error.message);\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Obtener un registro por ID
    content += `    getById: async (id) => {\n`;
    content += `        try {\n`;
    content += `            return await ${name}.findById(id);\n`;
    content += `        } catch (error) {\n`;
    content += `            throw new Error('Error al obtener el registro: ' + error.message);\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Actualizar un registro por ID
    content += `    updateById: async (id, data) => {\n`;
    content += `        try {\n`;
    content += `            return await ${name}.findByIdAndUpdate(id, data, { new: true });\n`;
    content += `        } catch (error) {\n`;
    content += `            throw new Error('Error al actualizar el registro: ' + error.message);\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Eliminar un registro por ID
    content += `    deleteById: async (id) => {\n`;
    content += `        try {\n`;
    content += `            return await ${name}.findByIdAndDelete(id);\n`;
    content += `        } catch (error) {\n`;
    content += `            throw new Error('Error al eliminar el registro: ' + error.message);\n`;
    content += `        }\n`;
    content += `    },\n`;
    
    content += `};\n\n`;
    content += `module.exports = ${name}Service;\n`;

    return content;
}

const genJsController = (name: string) => {
    let content = `const ${name}Service = require('../services/${name}.service');\n\n`;
    content += `const ${name}Controller = {\n`;
    
    // Obtener todos los registros
    content += `    getAll: async (req, res) => {\n`;
    content += `        try {\n`;
    content += `            const data = await ${name}Service.getAll();\n`;
    content += `            res.json(data);\n`;
    content += `        } catch (error) {\n`;
    content += `            res.status(500).json({ error: error.message });\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Crear un nuevo registro
    content += `    create: async (req, res) => {\n`;
    content += `        try {\n`;
    content += `            const data = req.body;\n`;
    content += `            const new${capitalizeType(name)} = await ${name}Service.create(data);\n`;
    content += `            res.status(201).json(new${capitalizeType(name)});\n`;
    content += `        } catch (error) {\n`;
    content += `            res.status(400).json({ error: error.message });\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Obtener un registro por ID
    content += `    getById: async (req, res) => {\n`;
    content += `        try {\n`;
    content += `            const id = req.params.id;\n`;
    content += `            const data = await ${name}Service.getById(id);\n`;
    content += `            if (!data) return res.status(404).json({ error: 'Registro no encontrado' });\n`;
    content += `            res.json(data);\n`;
    content += `        } catch (error) {\n`;
    content += `            res.status(500).json({ error: error.message });\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Actualizar un registro por ID
    content += `    updateById: async (req, res) => {\n`;
    content += `        try {\n`;
    content += `            const id = req.params.id;\n`;
    content += `            const data = req.body;\n`;
    content += `            const updated = await ${name}Service.updateById(id, data);\n`;
    content += `            if (!updated) return res.status(404).json({ error: 'Registro no encontrado' });\n`;
    content += `            res.json(updated);\n`;
    content += `        } catch (error) {\n`;
    content += `            res.status(400).json({ error: error.message });\n`;
    content += `        }\n`;
    content += `    },\n\n`;
    
    // Eliminar un registro por ID
    content += `    deleteById: async (req, res) => {\n`;
    content += `        try {\n`;
    content += `            const id = req.params.id;\n`;
    content += `            const deleted = await ${name}Service.deleteById(id);\n`;
    content += `            if (!deleted) return res.status(404).json({ error: 'Registro no encontrado' });\n`;
    content += `            res.json({ message: 'Registro eliminado' });\n`;
    content += `        } catch (error) {\n`;
    content += `            res.status(500).json({ error: error.message });\n`;
    content += `        }\n`;
    content += `    },\n`;
    
    content += `};\n\n`;
    content += `module.exports = ${name}Controller;\n`;

    return content;
};
const genJsRoutes = (name: string) => {
    let content = `const express = require('express');\nconst router = express.Router();\nconst ${name}Controller = require('../controllers/${name}.controller');\n\n`;
    content += `router.get('/', ${name}Controller.getAll);\n`;
    content += `router.post('/', ${name}Controller.create);\n`;
    content += `router.get('/:id', ${name}Controller.getById);\n`;
    content += `router.put('/:id', ${name}Controller.updateById);\n`;
    content += `router.delete('/:id', ${name}Controller.deleteById);\n\n`;
    content += `module.exports = router;\n`;
    return content;
};

const genJsIndex = (names: string[], projectName: string) => {
    let content = `const express = require('express');\n`;
    content += `const cors = require('cors');\n`;
    content += `const mongoose = require('mongoose');\n\n`;

    content += `const app = express();\n`;
    content += `app.use(cors());\n`;
    content += `app.use(express.json());\n\n`;
    content += `mongoose.connect('mongodb://localhost/${projectName}', { useNewUrlParser: true, useUnifiedTopology: true });\n\n`;

    for (const name of names) {
        content += `app.use('/api/${name}', require('./routes/${name}.routes'));\n`;
    }

    content += `\nconst PORT = parseInt(process.env.PORT, 10) || 3000;\n`;
    content += `app.listen(PORT, () => {\n`;
    content += `    console.log(\`Server is running on port \${PORT}\`);\n`;
    content += `});\n`;

    return content;
};
const genPackageJson = (projectName: string, version = '1.0.0', description = '') => {
    return `
    {
        "name": "${projectName}",
        "version": "${version}",
        "description": "${description}",
        "main": "index.js",
        "scripts": {
                "start": "node index.js",
                "dev": "nodemon ./src/index.js"
        },
        "keywords": [],
        "author": "",
        "license": "ISC",
        "dependencies": {
                "cors": "^2.8.5",
                "express": "^4.18.2",
                "mongoose": "^7.0.4"
        },
        "devDependencies": {
                "nodemon": "^3.1.7"
        }
}`;
};


export default {
    genJsModel,
    genJsController,
    genJsRoutes,
    genJsIndex,
    genPackageJson,
    genJsService
};
