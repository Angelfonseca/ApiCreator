interface Field {
    name: string;
    type: string; 
    ref?: string;     
}
const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};
const genJsModel = (name: string, fields: Field[]) => {
    let content = `const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n`;
    content += `const ${name}Schema = new Schema({\n`;

    for (const field of fields) {
        if (field.ref) {
            // Si tiene referencia (relación con otro modelo)
            content += `    ${field.name}: { type: Schema.Types.ObjectId, ref: '${field.ref}' },\n`;
        } else {
            // Si no tiene referencia, solo el tipo
            content += `    ${field.name}: { type: ${capitalizeType(field.type)} },\n`;
        }
    }

    content += `}, { timestamps: true });\n\n`;
    content += `module.exports = mongoose.model('${name}', ${name}Schema);\n`;

    return content;
};

const genJsController = (name: string) => {
    let content = `const ${name} = require('../models/${name}.model');\n\n`;
    content += `const ${name}Controller = {\n`;
    content += `    getAll: async (req, res) => {\n`;
    content += `        const data = await ${name}.find();\n`;
    content += `        res.json(data);\n`;
    content += `    },\n\n`;
    content += `    create: async (req, res) => {\n`;
    content += `        const data = req.body;\n`;
    content += `        const new${capitalizeType(name)} = new ${name}(data);\n`;
    content += `        await new${capitalizeType(name)}.save();\n`;
    content += `        res.json(new${capitalizeType(name)});\n`;
    content += `    },\n\n`;
    content += `    getById: async (req, res) => {\n`;
    content += `        const id = req.params.id;\n`;
    content += `        const data = await ${name}.findById(id);\n`;
    content += `        res.json(data);\n`;
    content += `    },\n\n`;
    content += `    updateById: async (req, res) => {\n`;
    content += `        const id = req.params.id;\n`;
    content += `        const data = req.body;\n`;
    content += `        await ${name}.findByIdAndUpdate(id, data);\n`;
    content += `        res.json({ message: 'Updated' });\n`;
    content += `    },\n\n`;
    content += `    deleteById: async (req, res) => {\n`;
    content += `        const id = req.params.id;\n`;
    content += `        await ${name}.findByIdAndDelete(id);\n`;
    content += `        res.json({ message: 'Deleted' });\n`;
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
};
