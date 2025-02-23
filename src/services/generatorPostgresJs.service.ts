import fs from 'fs';
import path from 'path';

interface Field {
    name: string;
    type: string; // Ejemplo: 'STRING', 'INTEGER', 'BOOLEAN', etc.
    allowNull?: boolean; // Si el campo puede ser nulo
    defaultValue?: any; // Valor por defecto
    references?: { model: string; key: string }; // Para relaciones
}

interface DbConfig {
    database: string;
    username: string;
    password: string;
    host: string;
    port: number;
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const genJsModel = (name: string, fields: Field[]) => {
    let content = `const { DataTypes } = require('sequelize');\n\n`;
    for (const field of fields) {
        if (field.references) {
            content += `const ${field.references.model} = require('./${field.references.model}.model');\n`;
        }
    }
    content += `module.exports = (sequelize) => {\n`;
    content += `  const ${capitalize(name)} = sequelize.define('${name}', {\n`;
    content += `    id: {\n`;
    content += `      type: DataTypes.INTEGER,\n`;
    content += `      primaryKey: true,\n`;
    content += `      autoIncrement: true,\n`;
    content += `    },\n`;
    for (const field of fields) {
        if (field.name === 'id') continue; // Evitar duplicar el campo 'id'
        content += `    ${field.name}: {\n`;
        content += `      type: DataTypes.${field.type},\n`;
        if (field.allowNull !== undefined) {
            content += `      allowNull: ${field.allowNull},\n`;
        }
        if (field.defaultValue !== undefined) {
            content += `      defaultValue: ${JSON.stringify(field.defaultValue)},\n`;
        }
        if (field.references) {
            content += `      references: {\n`;
            content += `        model: ${field.references.model}(sequelize),\n`;
            content += `        key: '${field.references.key}'\n`;
            content += `      },\n`;
        }
        content += `    },\n`;
    }
    content += `  }, {\n`;
    content += `    timestamps: true,\n`;
    content += `  });\n\n`;
    content += `  return ${capitalize(name)};\n`;
    content += `};\n`;

    return content;
};

const genJsService = (name: string) => {
    const capitalizedName = capitalize(name);

    let content = `
const { ${capitalizedName} } = require('../models/${name}.model');

const getAll = async (${capitalizedName}, options = {}) => {
    try {
        return await ${capitalizedName}.findAll({
            ...options,
            order: options.order || [['createdAt', 'DESC']]
        });
    } catch (error) {
        throw new Error(\`Error fetching ${capitalizedName}s: \${error.message}\`);
    }
};

const create = async (${capitalizedName}, data) => {
    try {
        const newRecord = await ${capitalizedName}.create(data);
        return await ${capitalizedName}.findByPk(newRecord.id);
    } catch (error) {
        throw new Error(\`Error creating ${capitalizedName}: \${error.message}\`);
    }
};

const getById = async (${capitalizedName}, id, options = {}) => {
    try {
        const record = await ${capitalizedName}.findByPk(id, {
            ...options
        });
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return record;
    } catch (error) {
        throw new Error(\`Error fetching ${capitalizedName}: \${error.message}\`);
    }
};

const updateById = async (${capitalizedName}, id, data, options = {}) => {
    try {
        const record = await ${capitalizedName}.findByPk(id);
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        await record.update(data);
        return await ${capitalizedName}.findByPk(id, {
            ...options
        });
    } catch (error) {
        throw new Error(\`Error updating ${capitalizedName}: \${error.message}\`);
    }
};

const deleteById = async (${capitalizedName}, id) => {
    try {
        const record = await ${capitalizedName}.findByPk(id);
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        await record.destroy();
        return { success: true, message: \`${capitalizedName} deleted successfully\` };
    } catch (error) {
        throw new Error(\`Error deleting ${capitalizedName}: \${error.message}\`);
    }
};

const bulkCreate = async (${capitalizedName}, records) => {
    try {
        return await ${capitalizedName}.bulkCreate(records, {
            returning: true,
            validate: true
        });
    } catch (error) {
        throw new Error(\`Error bulk creating ${capitalizedName}s: \${error.message}\`);
    }
};

const findOrCreate = async (${capitalizedName}, where, defaults) => {
    try {
        const [record, created] = await ${capitalizedName}.findOrCreate({
            where,
            defaults
        });
        return { record, created };
    } catch (error) {
        throw new Error(\`Error finding or creating ${capitalizedName}: \${error.message}\`);
    }
};

module.exports = {
    getAll,
    create,
    getById,
    updateById,
    deleteById,
    bulkCreate,
    findOrCreate
};
`;

    return content;
};

const genJsController = (name: string) => {
    const capitalizedName = capitalize(name);

    let content = `const ${capitalizedName}Service = require('../services/${name}.service');\n\n`;

    // Get all records
    content += `const getAll = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const options = req.query;\n`;
    content += `    const data = await ${capitalizedName}Service.getAll(options);\n`;
    content += `    res.status(200).json({\n`;
    content += `      success: true,\n`;
    content += `      data\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(500).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    // Create new record
    content += `const create = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const data = req.body;\n`;
    content += `    const record = await ${capitalizedName}Service.create(data);\n`;
    content += `    res.status(201).json({\n`;
    content += `      success: true,\n`;
    content += `      data: record\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(400).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    // Get record by ID
    content += `const getById = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const { id } = req.params;\n`;
    content += `    const record = await ${capitalizedName}Service.getById(id);\n`;
    content += `    res.status(200).json({\n`;
    content += `      success: true,\n`;
    content += `      data: record\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(404).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    // Update record by ID
    content += `const updateById = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const { id } = req.params;\n`;
    content += `    const data = req.body;\n`;
    content += `    const record = await ${capitalizedName}Service.updateById(id, data);\n`;
    content += `    res.status(200).json({\n`;
    content += `      success: true,\n`;
    content += `      data: record\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(400).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    // Delete record by ID
    content += `const deleteById = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const { id } = req.params;\n`;
    content += `    await ${capitalizedName}Service.deleteById(id);\n`;
    content += `    res.status(200).json({\n`;
    content += `      success: true,\n`;
    content += `      message: '${capitalizedName} deleted successfully'\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(400).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    // Bulk create records
    content += `const bulkCreate = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const records = req.body;\n`;
    content += `    const created = await ${capitalizedName}Service.bulkCreate(records);\n`;
    content += `    res.status(201).json({\n`;
    content += `      success: true,\n`;
    content += `      data: created\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(400).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    // Find or create record
    content += `const findOrCreate = async (req, res) => {\n`;
    content += `  try {\n`;
    content += `    const { where, defaults } = req.body;\n`;
    content += `    const result = await ${capitalizedName}Service.findOrCreate(where, defaults);\n`;
    content += `    res.status(200).json({\n`;
    content += `      success: true,\n`;
    content += `      data: result\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    res.status(400).json({\n`;
    content += `      success: false,\n`;
    content += `      error: error.message\n`;
    content += `    });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `module.exports = {\n`;
    content += `  getAll,\n`;
    content += `  create,\n`;
    content += `  getById,\n`;
    content += `  updateById,\n`;
    content += `  deleteById,\n`;
    content += `  bulkCreate,\n`;
    content += `  findOrCreate\n`;
    content += `};\n`;

    return content;
};

const genJsRoutes = (name: string, fields: Field[]) => {
    const capitalizedName = capitalize(name);

    let content = `const express = require('express');\n`;
    content += `const router = express.Router();\n`;
    content += `const ${capitalizedName}Controller = require('../controllers/${name}.controller');\n\n`;

    // Swagger documentation for GET all records
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}:\n`;
    content += ` *   get:\n`;
    content += ` *     summary: Obtener todos los registros de ${name}\n`;
    content += ` *     description: Retorna una lista de todos los registros de ${name}.\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Lista de registros obtenida exitosamente.\n`;
    content += ` */\n`;
    content += `router.get('/', ${capitalizedName}Controller.getAll);\n\n`;

    // Swagger documentation for POST create record
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}:\n`;
    content += ` *   post:\n`;
    content += ` *     summary: Crear un nuevo registro de ${name}\n`;
    content += ` *     description: Crea un nuevo registro de ${name} con los datos proporcionados.\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             type: object\n`;
    content += ` *             properties:\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += ` *               ${field.name}:\n`;
        content += ` *                 type: ${field.type.toLowerCase()}\n`;
        if (field.defaultValue !== undefined) {
            content += ` *                 default: ${JSON.stringify(field.defaultValue)}\n`;
        }
        if (field.allowNull !== undefined) {
            content += ` *                 required: ${!field.allowNull}\n`;
        }
        if (field.references) {
            content += ` *                 description: References ${field.references.model} on ${field.references.key}\n`;
        }
    }
    content += ` *     responses:\n`;
    content += ` *       201:\n`;
    content += ` *         description: Registro creado exitosamente.\n`;
    content += ` */\n`;
    content += `router.post('/', ${capitalizedName}Controller.create);\n\n`;

    // Swagger documentation for GET record by ID
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/{id}:\n`;
    content += ` *   get:\n`;
    content += ` *     summary: Obtener un registro de ${name} por ID\n`;
    content += ` *     description: Retorna un registro de ${name} basado en el ID proporcionado.\n`;
    content += ` *     parameters:\n`;
    content += ` *       - in: path\n`;
    content += ` *         name: id\n`;
    content += ` *         required: true\n`;
    content += ` *         schema:\n`;
    content += ` *           type: integer\n`;
    content += ` *         description: ID del registro a obtener.\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Registro obtenido exitosamente.\n`;
    content += ` *       404:\n`;
    content += ` *         description: Registro no encontrado.\n`;
    content += ` */\n`;
    content += `router.get('/:id', ${capitalizedName}Controller.getById);\n\n`;

    // Swagger documentation for PUT update record by ID
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/{id}:\n`;
    content += ` *   put:\n`;
    content += ` *     summary: Actualizar un registro de ${name} por ID\n`;
    content += ` *     description: Actualiza un registro de ${name} basado en el ID proporcionado.\n`;
    content += ` *     parameters:\n`;
    content += ` *       - in: path\n`;
    content += ` *         name: id\n`;
    content += ` *         required: true\n`;
    content += ` *         schema:\n`;
    content += ` *           type: object\n`;
    content += ` *             properties:\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += ` *               ${field.name}:\n`;
        content += ` *                 type: ${field.type.toLowerCase()}\n`;
        if (field.defaultValue !== undefined) {
            content += ` *                 default: ${JSON.stringify(field.defaultValue)}\n`;
        }
        if (field.allowNull !== undefined) {
            content += ` *                 required: ${!field.allowNull}\n`;
        }
        if (field.references) {
            content += ` *                 description: References ${field.references.model} on ${field.references.key}\n`;
        }
    }
    content += ` *           schema:\n`;
    content += ` *             $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Registro actualizado exitosamente.\n`;
    content += ` *       404:\n`;
    content += ` *         description: Registro no encontrado.\n`;
    content += ` */\n`;
    content += `router.put('/:id', ${capitalizedName}Controller.updateById);\n\n`;

    // Swagger documentation for DELETE record by ID
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/{id}:\n`;
    content += ` *   delete:\n`;
    content += ` *     summary: Eliminar un registro de ${name} por ID\n`;
    content += ` *     description: Elimina un registro de ${name} basado en el ID proporcionado.\n`;
    content += ` *     parameters:\n`;
    content += ` *       - in: path\n`;
    content += ` *         name: id\n`;
    content += ` *         required: true\n`;
    content += ` *         schema:\n`;
    content += ` *           type: integer\n`;
    content += ` *         description: ID del registro a eliminar.\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Registro eliminado exitosamente.\n`;
    content += ` *       404:\n`;
    content += ` *         description: Registro no encontrado.\n`;
    content += ` */\n`;
    content += `router.delete('/:id', ${capitalizedName}Controller.deleteById);\n\n`;

    // Swagger documentation for POST bulk create records
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/bulk:\n`;
    content += ` *   post:\n`;
    content += ` *     summary: Crear múltiples registros de ${name}\n`;
    content += ` *     description: Crea múltiples registros de ${name} con los datos proporcionados.\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             type: object\n`;
    content += ` *             properties:\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += ` *               ${field.name}:\n`;
        content += ` *                 type: ${field.type.toLowerCase()}\n`;
        if (field.defaultValue !== undefined) {
            content += ` *                 default: ${JSON.stringify(field.defaultValue)}\n`;
        }
        if (field.allowNull !== undefined) {
            content += ` *                 required: ${!field.allowNull}\n`;
        }
        if (field.references) {
            content += ` *                 description: References ${field.references.model} on ${field.references.key}\n`;
        }
    }
    content += ` *               defaults:\n`;
    content += ` *               $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       201:\n`;
    content += ` *         description: Registros creados exitosamente.\n`;
    content += ` */\n`;
    content += `router.post('/bulk', ${capitalizedName}Controller.bulkCreate);\n\n`;

    // Swagger documentation for POST find or create record
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/find-or-create:\n`;
    content += ` *   post:\n`;
    content += ` *     summary: Buscar o crear un registro de ${name}\n`;
    content += ` *     description: Busca un registro de ${name} basado en los criterios proporcionados. Si no existe, lo crea.\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             type: object\n`;
    content += ` *             properties:\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += ` *               ${field.name}:\n`;
        content += ` *                 type: ${field.type.toLowerCase()}\n`;
        if (field.defaultValue !== undefined) {
            content += ` *                 default: ${JSON.stringify(field.defaultValue)}\n`;
        }
        if (field.allowNull !== undefined) {
            content += ` *                 required: ${!field.allowNull}\n`;
        }
        if (field.references) {
            content += ` *                 description: References ${field.references.model} on ${field.references.key}\n`;
        }
    }
    content += ` *               defaults:\n`;
    content += ` *                 $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Registro encontrado o creado exitosamente.\n`;
    content += ` */\n`;
    content += `router.post('/find-or-create', ${capitalizedName}Controller.findOrCreate);\n\n`;

    content += `module.exports = router;\n`;

    return content;
};
const genSequelizeConfig = (projectName: string, config: DbConfig): string => {
    let content = `import { Sequelize } from 'sequelize';\n`;
    content += `import dotenv from 'dotenv';\n\n`;
    content += `dotenv.config();\n\n`;
    content += `const sequelize = new Sequelize('${config.database}', '${config.username}', '${config.password}', {\n`;
    content += `    host: '${config.host}',\n`;
    content += `    port: ${config.port},\n`;
    content += `    dialect: 'postgres',\n`;
    content += `    logging: false,\n`;
    content += `});\n\n`;
    content += `const tempSequelize = new Sequelize('postgres', '${config.username}', '${config.password}', {\n`;
    content += `    host: '${config.host}',\n`;
    content += `    port: ${config.port},\n`;
    content += `    dialect: 'postgres',\n`;
    content += `});\n\n`;
    content += `const databaseExists = async (dbName) => {\n`;
    content += `    try {\n`;
    content += `        const [results] = await tempSequelize.query(\n`;
    content += `            \`SELECT 1 FROM pg_database WHERE datname = '\${dbName}'\`\n`;
    content += `        );\n`;
    content += `        return results.length > 0;\n`;
    content += `    } catch (error) {\n`;
    content += `        console.error('Error checking database existence:', error);\n`;
    content += `        return false;\n`;
    content += `    }\n`;
    content += `};\n\n`;
    content += `export async function createDatabaseIfNotExists() {\n`;
    content += `    const exists = await databaseExists('${config.database}');\n`;
    content += `    if (exists) {\n`;
    content += `        console.log('Database "${config.database}" already exists.');\n`;
    content += `        return;\n`;
    content += `    }\n\n`;
    content += `    try {\n`;
    content += `        await tempSequelize.authenticate();\n`;
    content += `        console.log('Connected to default database (postgres).');\n`;
    content += `        await tempSequelize.query(\`CREATE DATABASE "${config.database}";\`);\n`;
    content += `        console.log('Database "${config.database}" created successfully.');\n`;
    content += `    } catch (error) {\n`;
    content += `        console.error('Error creating database:', error);\n`;
    content += `    } finally {\n`;
    content += `        await tempSequelize.close();\n`;
    content += `    }\n`;
    content += `}\n\n`;
    content += `export { sequelize };\n`;
    return content;
};

const genJsIndex = (names: string[], projectName: string) => {
    let content = `const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const {sequelize, createDatabaseIfNotExists} = require('./config/sequelize.config');
const swaggerDocs = require('./swagger');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
swaggerDocs(app);
// Request logging middleware
app.use((req, res, next) => {
    console.log(\`\${req.method} \${req.url}\`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// Import and initialize models
const models = {};
${names.map(name => `models['${name}'] = require('./models/${name}.model')(sequelize);`).join('\n')}

// Database synchronization
const initializeDatabase = async () => {
    try {
        await createDatabaseIfNotExists();
        console.log('Database connection established');

        // Sincroniza todos los modelos con la base de datos
        await sequelize.sync({ force: true }); // Usar { force: true } solo en desarrollo para recrear las tablas
        console.log('Database synchronized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
};

// API Routes
${names.map(name => `app.use('/api/${name}', require('./routes/${name}.routes'));`).join('\n')}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(\`Server running on port \${PORT}\`);
            console.log(\`API Documentation: http://localhost:\${PORT}/api-docs\`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});
`;

    return content;
};

const genPackageJson = (projectName: string) => {
    return `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node ./src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "pg": "^8.7.1",
    "sequelize": "^6.6.5",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^4.6.3"
  }
}
`;
}

const genSwaggerJs = (modelos: any, projectName: string) => {
    let content = `
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'API Documentation',
                version: '1.0.0',
                description: 'API documentation for the ${projectName} model',
            },
            servers: [
                {
                    url: 'http://localhost:3000/api/',
                },
            ],
            components: {
                schemas: {
    `;
    for (const modelo of modelos) {
        if (!modelo.name || !modelo.fields) {
            console.error(`Modelo inválido: falta 'name' o 'fields'`);
            continue;
        }

        content += `                ${modelo.name}: {\n`;
        content += `                    type: 'object',\n`;
        content += `                    properties: {\n`;
    for (const field of modelo.fields) {
        content += `                        ${field.name}: {\n`;
        content += `                            type: '${field.type.toLowerCase()}',\n`;
        content += `                            description: 'A field for ${modelo.name}',\n`;
        content += `                        },\n`;
    }
    content += `                    }\n`;
    content += `                },\n`;
}
content += `            },\n`;
content += `        },\n`;
content += `        apis: ['./src/routes/*.js'],\n`;
content += `    };\n`;
content += `    const swaggerDocument = swaggerJsdoc(options);\n`;
content += `    const swaggerDocs = (app) => {\n`;
content += `        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));\n`;
content += `    };\n`;
content += `    module.exports = swaggerDocs;\n`;
    return content;
}




export default {
    genJsModel,
    genJsService,
    genJsController,
    genJsRoutes,
    genSequelizeConfig,
    genJsIndex,
    genPackageJson,
    genSwaggerJs
};
