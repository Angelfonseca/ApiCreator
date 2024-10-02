interface Field {
    name: string;
    type: string; // Primitive type or relationship
    ref?: string;     // Reference to another model (relationship)
}

// Generate model
const genModel = (name: string, fields: Field[]): string => {
    const fieldLines = fields.map(field =>
        field.ref ? `${field.name}: ${field.type} | ${field.ref};` : `${field.name}: ${field.type.charAt(0).toUpperCase()};`
    ).join('\n');

    const schemaLines = fields.map(field =>
        field.ref ? `${field.name}: { type: Schema.Types.ObjectId, ref: '${field.ref}' }` : `${field.name}: { type: ${field.type.charAt(0).toUpperCase() + field.type.slice(1)} }`
    ).join(',\n');




    // Final model template
    return `
import { Schema, model } from 'mongoose';
import { ${name} } from '../interfaces/${name}.interface';
export const ${name}Model = new Schema<${name}>({
    ${schemaLines}
});

export default model<${name}>('${name}', ${name}Model);
`;
};

const genModelInterface = (name: string, fields: Field[]): string => {
    const interfaceLines = fields.map(field =>
        field.name + ': ' + field.type.charAt(0).toUpperCase() + field.type.slice(1) + ';'
    ).join('\n');

    return `
export interface ${name} {
    ${interfaceLines}
}
`;
};

// Generate services
const genServices = (name: string, fields: Field[]): string => {
    return `
import { ${name} } from '../interfaces/${name}.interface';
import  ${name}Model  from '../models/${name}.model';

const create${name} = async (data: ${name}): Promise<${name}> => {
    return ${name}Model.create(data);
};

const get${name} = async (id: string): Promise<${name} | null> => {
    return ${name}Model.findById(id);
};

const get${name}s = async (): Promise<${name}[]> => {
    return ${name}Model.find();
};

const update${name} = async (id: string, data: ${name}): Promise<${name} | null> => {
    return ${name}Model.findByIdAndUpdate(id, data, { new: true });
};

const delete${name} = async (id: string): Promise<${name} | null> => {
    return ${name}Model.findByIdAndDelete(id);
};

export default {
    create${name},
    get${name},
    get${name}s,
    update${name},
    delete${name}
};
`;
};

// Generate controllers
const genControllers = (name: string, fields: Field[]): string => {
    return `
import { Request, Response } from 'express';
import ${name}Services from '../services/${name}.service';

const create${name} = async (req: Request, res: Response) => {
    try {
        const ${name} = await ${name}Services.create${name}(req.body);
        res.status(201).json(${name});
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

const get${name} = async (req: Request, res: Response) => {
    try {
        const ${name} = await ${name}Services.get${name}(req.params.id);
        res.status(200).json(${name});
    } catch (error: any) {
        res.status(404).json({ message: error.message });
    }
};

const get${name}s = async (req: Request, res: Response) => {
    try {
        const ${name}s = await ${name}Services.get${name}s();
        res.status(200).json(${name}s);
    } catch (error: any) {
        res.status(404).json({ message: error.message });
    }
};

const update${name} = async (req: Request, res: Response) => {
    try {
        const ${name} = await ${name}Services.update${name}(req.params.id, req.body);
        res.status(200).json(${name});
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

const delete${name} = async (req: Request, res: Response) => {
    try {
        const ${name} = await ${name}Services.delete${name}(req.params.id);
        res.status(200).json(${name});
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};



// Implement other controller methods similarly...

export default {
    create${name},
    get${name},
    get${name}s,
    update${name},
    delete${name}    
};
`;
};

// Generate routes
const genRoutes = (name: string): string => {
    return `
import { Router } from 'express';
import ${name}Controllers from '../controllers/${name}.controller';

const router = Router();

router.post('/', ${name}Controllers.create${name});
router.get('/:id', ${name}Controllers.get${name});
router.get('/', ${name}Controllers.get${name}s);
router.put('/:id', ${name}Controllers.update${name});
router.delete('/:id', ${name}Controllers.delete${name});

// Implement other routes...

export default router;
`;
};

// Generate index
const genIndex = (names: string[]): string => {
    const imports = names.map(name => `import ${name}Routes from '../src/routes/${name}.routes';`).join('\n');
    const routes = names.map(name => `app.use('/${name}', ${name}Routes);`).join('\n');

    return `
import express from 'express';
import mongoose from 'mongoose';

const app = express();

app.use(express.json());

mongoose.set('strictQuery', true);
mongoose.connect('mongodb://localhost:27017/test')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

${imports}

${routes}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
`;
};

// Generate package.json
const genPackageJson = (name: string) => {
    return `
    {
        "name": "${name}",
        "version": "1.0.0",
        "main": "index.js",
        "scripts": {
            "test": "echo \\"Error: no test specified\\" && exit 1",
            "dev": "nodemon --exec ts-node src/index.ts"
        },
        "keywords": [],
        "author": "",
        "license": "ISC",
        "description": "",
        "devDependencies": {
            "@types/cors": "^2.8.17",
            "@types/express": "^5.0.0",
            "nodemon": "^3.1.7",
            "ts-node": "^10.9.2",
            "typescript": "^5.6.2",
            "mongoose": "^6.1.0"
        },
        "dependencies": {
            "cors": "^2.8.5",
            "express": "^4.21.0",
            "mongoose": "^6.1.0"
        }
    }`;
};

const generateBat = (name: string) => {
    return `
    echo instalando dependencias
    start /d npm install
    echo generando tsc
    start /d npx tsc --init
    echo iniciando servidor
    start /d npm run dev
    `;
}

export default {
    genModel,
    genServices,
    genModelInterface,
    genControllers,
    genRoutes,
    genIndex,
    genPackageJson,
    generateBat
};
