interface Field {
    name: string;
    type: string; // Ejemplo: 'STRING', 'INTEGER', 'BOOLEAN', etc.
    allowNull?: boolean; // Si el campo puede ser nulo
    defaultValue?: any; // Valor por defecto
    references?: { model: string; key: string }; // Para relaciones
    fields?: Field[]; // Subcampos para objetos anidados
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
            if (field.references) {
                subSchemaContent += `    ${field.name}: { type: Schema.Types.ObjectId, ref: '${field.references.model}' },\n`;
            } else if (field.type.toUpperCase() === 'OBJECT' && field.fields) {
                subSchemaContent += `    ${field.name}: ${generateSubSchema(field.fields)},\n`;
            } else {
                let schemaField = `    ${field.name}: { type: ${capitalizeType(field.type)}`;
                if (field.allowNull !== undefined) {
                    schemaField += `, required: ${!field.allowNull}`;
                }
                if (field.defaultValue !== undefined) {
                    schemaField += `, default: ${JSON.stringify(field.defaultValue)}`;
                }
                schemaField += ` },\n`;
                subSchemaContent += schemaField;
            }
        }
        subSchemaContent += `})`;
        return subSchemaContent;
    };

    content += `const ${name}Schema = new Schema({\n`;

    for (const field of fields) {
        if (field.references) {
            content += `    ${field.name}: { type: Schema.Types.ObjectId, ref: '${field.references.model}' },\n`;
        } else if (field.type.toUpperCase() === 'OBJECT' && field.fields) {
            content += `    ${field.name}: ${generateSubSchema(field.fields)},\n`;
        } else {
            let schemaField = `    ${field.name}: { type: ${capitalizeType(field.type)}`;
            if (field.allowNull !== undefined) {
                schemaField += `, required: ${!field.allowNull}`;
            }
            if (field.defaultValue !== undefined) {
                schemaField += `, default: ${JSON.stringify(field.defaultValue)}`;
            }
            schemaField += ` },\n`;
            content += schemaField;
        }
    }

    content += `}, { timestamps: true });\n\n`;
    content += `module.exports = mongoose.model('${name}', ${name}Schema);\n`;

    return content;
};
const genMongooseJSService = (name: string) => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return `
const ${capitalizedName}Model = require('../models/${name}.model');

const getAll = async () => {
    try {
        return await ${capitalizedName}Model.find();
    } catch (error) {
        throw new Error(\`Error fetching ${capitalizedName}s: \${error.message}\`);
    }
};

const create = async (data) => {
    try {
        const newRecord = new ${capitalizedName}Model(data);
        return await newRecord.save();
    } catch (error) {
        throw new Error(\`Error creating ${capitalizedName}: \${error.message}\`);
    }
};

const getById = async (id) => {
    try {
        const record = await ${capitalizedName}Model.findById(id);
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return record;
    } catch (error) {
        throw new Error(\`Error fetching ${capitalizedName}: \${error.message}\`);
    }
};

const updateById = async (id, data) => {
    try {
        const record = await ${capitalizedName}Model.findByIdAndUpdate(id, data, { new: true });
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return record;
    } catch (error) {
        throw new Error(\`Error updating ${capitalizedName}: \${error.message}\`);
    }
};

const deleteById = async (id) => {
    try {
        const record = await ${capitalizedName}Model.findByIdAndDelete(id);
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return { success: true, message: \`${capitalizedName} deleted successfully\` };
    } catch (error) {
        throw new Error(\`Error deleting ${capitalizedName}: \${error.message}\`);
    }
};

module.exports = {
    getAll,
    create,
    getById,
    updateById,
    deleteById
};
`;
};

const genMongooseJSController = (name: string) => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return `
const ${capitalizedName}Service = require('../services/${name}.service');

const getAllController = async (req, res) => {
    try {
        const data = await ${capitalizedName}Service.getAll();
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const createController = async (req, res) => {
    try {
        const data = req.body;
        const record = await ${capitalizedName}Service.create(data);
        res.status(201).json({ success: true, data: record });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

const getByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await ${capitalizedName}Service.getById(id);
        res.status(200).json({ success: true, data: record });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
};

const updateByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const record = await ${capitalizedName}Service.updateById(id, data);
        res.status(200).json({ success: true, data: record });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

const deleteByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        await ${capitalizedName}Service.deleteById(id);
        res.status(200).json({ success: true, message: '${capitalizedName} deleted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

module.exports = {
    getAllController,
    createController,
    getByIdController,
    updateByIdController,
    deleteByIdController
};
`;
};

const genMongooseJSRoutes = (name: string) => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return `
const express = require('express');
const router = express.Router();
const ${capitalizedName}Controller = require('../controllers/${name}.controller');

/**
 * @swagger
 * /api/${name}:
 *   get:
 *     summary: Get all ${name} records
 *     description: Returns a list of all ${name} records.
 *     responses:
 *       200:
 *         description: Successfully retrieved records list.
 */
router.get('/', ${capitalizedName}Controller.getAllController);

/**
 * @swagger
 * /api/${name}:
 *   post:
 *     summary: Create a new ${name} record
 *     description: Creates a new ${name} record with provided data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       201:
 *         description: Record created successfully.
 */
router.post('/', ${capitalizedName}Controller.createController);

/**
 * @swagger
 * /api/${name}/{id}:
 *   get:
 *     summary: Get ${name} by ID
 *     description: Returns a single ${name} record by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record found successfully.
 *       404:
 *         description: Record not found.
 */
router.get('/:id', ${capitalizedName}Controller.getByIdController);

/**
 * @swagger
 * /api/${name}/{id}:
 *   put:
 *     summary: Update ${name} by ID
 *     description: Updates a ${name} record by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${capitalizedName}'
 *     responses:
 *       200:
 *         description: Record updated successfully.
 *       404:
 *         description: Record not found.
 */
router.put('/:id', ${capitalizedName}Controller.updateByIdController);

/**
 * @swagger
 * /api/${name}/{id}:
 *   delete:
 *     summary: Delete ${name} by ID
 *     description: Deletes a ${name} record by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record deleted successfully.
 *       404:
 *         description: Record not found.
 */
router.delete('/:id', ${capitalizedName}Controller.deleteByIdController);

module.exports = router;
`;
};
const genMongooseJSIndex = (names: string[], projectName: string) => {
    let imports = names.map(name => `const ${name}Routes = require('./routes/${name}.routes');`).join('\n');
    let routes = names.map(name => `app.use('/api/${name}', ${name}Routes);`).join('\n');

    return `
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerDocs = require('./swagger');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/${projectName}', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err));

${imports}

swaggerDocs(app);

${routes}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});
`;
};

const genPackageJson = (name: string) => {
    return `
{
    "name": "${name}",
    "version": "1.0.0",
    "description": "",
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
        "express": "^4.21.0",
        "mongoose": "^6.1.0",
        "swagger-jsdoc": "^6.2.8",
        "swagger-ui-express": "^4.6.3"
    },
    "devDependencies": {
        "nodemon": "^3.1.7"
    }
}`;
};

const genSwaggerJs = (models: any[], projectName: string) => {
    let content = `
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '${projectName} API Documentation',
            version: '1.0.0',
            description: 'API documentation for the ${projectName} project using Sequelize and Express',
        },
        servers: [
            {
                url: 'http://localhost:3000/api/',
            },
        ],
        components: {
            schemas: {
`;

    const generateProperties = (fields: any) => {
        let propertiesContent = '';
        for (const field of fields) {
            propertiesContent += `                        ${field.name}: {\n`;
            if (field.type === "object" && field.fields) {
                propertiesContent += `                            type: 'object',\n`;
                propertiesContent += `                            properties: {\n`;
                propertiesContent += generateProperties(field.fields);
                propertiesContent += `                            },\n`;
            } else {
                propertiesContent += `                            type: '${field.type.toLowerCase()}',\n`;
                propertiesContent += `                            description: 'Campo ${field.name}',\n`;
                if (field.references) {
                    propertiesContent += `                            ref: '${field.references.model}',\n`;
                }
            }
            propertiesContent += `                        },\n`;
        }
        return propertiesContent;
    };

    for (const model of models) {
        if (!model.name || !model.fields) {
            console.error(`Modelo inválido: falta 'name' o 'fields'`);
            continue;
        }

        content += `                ${model.name}: {\n`;
        content += `                    type: 'object',\n`;
        content += `                    properties: {\n`;
        content += generateProperties(model.fields);
        content += `                    },\n`;
        content += `                },\n`;
    }

    content += `            },\n`;
    content += `        },\n`;
    content += `    },\n`;
    content += `    apis: ['./src/routes/*.js'],\n`;
    content += `};\n\n`;

    content += `const swaggerDocs = (app) => {\n`;
    content += `    const swaggerSpec = swaggerJsdoc(options);\n`;
    content += `    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));\n`;
    content += `};\n\n`;

    content += `module.exports = swaggerDocs;\n`;

    return content;
};


export default {
    genJsModel,
    genMongooseJSController,
    genMongooseJSRoutes,
    genMongooseJSIndex,
    genPackageJson,
    genMongooseJSService,
    genSwaggerJs
};
