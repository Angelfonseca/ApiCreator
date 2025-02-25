interface Field {
    name: string;
    type: string; // Ejemplo: 'STRING', 'INTEGER', 'BOOLEAN', etc.
    allowNull?: boolean; // Si el campo puede ser nulo
    defaultValue?: any; // Valor por defecto
    references?: { model: string; key: string }; // Para relaciones
    fields?: Field[]; // Subcampos para objetos anidados
}
const genMongooseTSModel = (name: string, fields: Field[]): string => {
    const generateSchemaLines = (fields: Field[]): string => {
        return fields.map(field => {
            if (field.type === "object" && field.fields) {
                // Si el campo es un objeto, generar un subesquema
                return `${field.name}: { ${generateSchemaLines(field.fields)} }`;
            } else if (field.references) {
                // Si el campo tiene una referencia
                return `${field.name}: { type: Schema.Types.ObjectId, ref: '${field.references.model}' }`;
            } else {
                // Si el campo es primitivo
                return `${field.name}: { type: ${field.type.charAt(0).toUpperCase() + field.type.slice(1)} }`;
            }
        }).join(',\n');
    };

    const schemaLines = generateSchemaLines(fields);

    return `
import { Schema, model } from 'mongoose';

const ${name}Schema = new Schema({
${schemaLines}
});

export default model('${name}', ${name}Schema);
`;
};

const genMongooseTSInterface = (name: string, fields: Field[]): string => {
    const generateInterfaceLines = (fields: Field[]): string => {
        return fields.map(field => {
            if (field.type === "object" && field.fields) {
                // Si el campo es un objeto, generar una interfaz anidada
                return `${field.name}?: {\n${generateInterfaceLines(field.fields)}\n};`;
            } else if (field.references) {
                // Si el campo tiene una referencia
                return `${field.name}?: Schema.Types.ObjectId | ${field.references.model};`;
            } else {
                // Si el campo es primitivo
                return `${field.name}?: ${field.type.charAt(0).toUpperCase() + field.type.slice(1)};`;
            }
        }).join('\n');
    };

    const interfaceLines = generateInterfaceLines(fields);

    return `
import { Schema } from 'mongoose';

export interface ${name} {
 ${interfaceLines}
}
`;
};

const genMongooseTSService = (name: string): string => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return `
import ${capitalizedName}Model from '../models/${name}.model';

export const getAll = async () => {
    try {
        return await ${capitalizedName}Model.find();
    } catch (error: any) {
        throw new Error(\`Error fetching ${capitalizedName}s: \${error.message}\`);
    }
};

export const create = async (data: any) => {
    try {
        const newRecord = new ${capitalizedName}Model(data);
        return await newRecord.save();
    } catch (error: any) {
        throw new Error(\`Error creating ${capitalizedName}: \${error.message}\`);
    }
};

export const getById = async (id: string) => {
    try {
        const record = await ${capitalizedName}Model.findById(id);
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return record;
    } catch (error: any) {
        throw new Error(\`Error fetching ${capitalizedName}: \${error.message}\`);
    }
};

export const updateById = async (id: string, data: any) => {
    try {
        const record = await ${capitalizedName}Model.findByIdAndUpdate(id, data, { new: true });
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return record;
    } catch (error: any) {
        throw new Error(\`Error updating ${capitalizedName}: \${error.message}\`);
    }
};

export const deleteById = async (id: string) => {
    try {
        const record = await ${capitalizedName}Model.findByIdAndDelete(id);
        if (!record) {
            throw new Error(\`${capitalizedName} with id \${id} not found\`);
        }
        return { success: true, message: \`${capitalizedName} deleted successfully\` };
    } catch (error: any) {
        throw new Error(\`Error deleting ${capitalizedName}: \${error.message}\`);
    }
};
`;
};

const genMongooseTSController = (name: string): string => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return `
import { Request, Response } from 'express';
import { getAll, create, getById, updateById, deleteById } from '../services/${name}.service';

export const getAllController = async (req: Request, res: Response) => {
    try {
        const data = await getAll();
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createController = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const record = await create(data);
        res.status(201).json({ success: true, data: record });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const getByIdController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const record = await getById(id);
        res.status(200).json({ success: true, data: record });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
};

export const updateByIdController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const record = await updateById(id, data);
        res.status(200).json({ success: true, data: record });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const deleteByIdController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await deleteById(id);
        res.status(200).json({ success: true, message: '${capitalizedName} deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};
`;
};

const genMongooseTSRoutes = (name: string): string => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return `
import express from 'express';
import { 
    getAllController, 
    createController, 
    getByIdController, 
    updateByIdController, 
    deleteByIdController 
} from '../controllers/${name}.controller';

const router = express.Router();

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
router.get('/', getAllController);

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
router.post('/', createController);

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
router.get('/:id', getByIdController);

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
router.put('/:id', updateByIdController);

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
router.delete('/:id', deleteByIdController);

export default router;
`;
};

const genMongooseTSIndex = (names: string[], projectName: string): string => {
    const imports = names.map(name => `import ${name}Routes from './routes/${name}.routes';`).join('\n');
    const routes = names.map(name => `app.use('/api/${name}', ${name}Routes);`).join('\n');

    return `
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import connectDB from './config/db';
import swaggerDocs from './swagger';
${imports}

const app = express();

app.use(cors());
app.use(express.json());
swaggerDocs(app);

${routes}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    await connectDB();
    console.log(\`Server running on port \${PORT}\`);
});
`;
};

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
            "@types/swagger-jsdoc": "^6.0.4",
            "@types/swagger-ui-express": "^4.1.8",
            "nodemon": "^3.1.7",
            "ts-node": "^10.9.2",
            "typescript": "^5.6.2",
            "mongoose": "^6.1.0"

        },
        "dependencies": {
            "cors": "^2.8.5",
            "express": "^4.21.0",
            "mongoose": "^6.1.0",
            "swagger-jsdoc": "^6.2.8",
            "swagger-ui-express": "^4.6.3"
        }
    }`;
};

const genMongooseTSDBConfig = (dbName: string): string => {
    return `
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/${dbName}', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

export default connectDB;
`;
};

const gentTsConfig = () => {
    return `
    {
  "compilerOptions": {
    /* Visit https://aka.ms/tsconfig to read more about this file */

    /* Projects */
    // "incremental": true,                              /* Save .tsbuildinfo files to allow for incremental compilation of projects. */
    // "composite": true,                                /* Enable constraints that allow a TypeScript project to be used with project references. */
    // "tsBuildInfoFile": "./.tsbuildinfo",              /* Specify the path to .tsbuildinfo incremental compilation file. */
    // "disableSourceOfProjectReferenceRedirect": true,  /* Disable preferring source files instead of declaration files when referencing composite projects. */
    // "disableSolutionSearching": true,                 /* Opt a project out of multi-project reference checking when editing. */
    // "disableReferencedProjectLoad": true,             /* Reduce the number of projects loaded automatically by TypeScript. */

    /* Language and Environment */
    "target": "es2016",                                  /* Set the JavaScript language version for emitted JavaScript and include compatible library declarations. */
    // "lib": [],                                        /* Specify a set of bundled library declaration files that describe the target runtime environment. */
    // "jsx": "preserve",                                /* Specify what JSX code is generated. */
    // "experimentalDecorators": true,                   /* Enable experimental support for legacy experimental decorators. */
    // "emitDecoratorMetadata": true,                    /* Emit design-type metadata for decorated declarations in source files. */
    // "jsxFactory": "",                                 /* Specify the JSX factory function used when targeting React JSX emit, e.g. 'React.createElement' or 'h'. */
    // "jsxFragmentFactory": "",                         /* Specify the JSX Fragment reference used for fragments when targeting React JSX emit e.g. 'React.Fragment' or 'Fragment'. */
    // "jsxImportSource": "",                            /* Specify module specifier used to import the JSX factory functions when using 'jsx: react-jsx*'. */
    // "reactNamespace": "",                             /* Specify the object invoked for 'createElement'. This only applies when targeting 'react' JSX emit. */
    // "noLib": true,                                    /* Disable including any library files, including the default lib.d.ts. */
    // "useDefineForClassFields": true,                  /* Emit ECMAScript-standard-compliant class fields. */
    // "moduleDetection": "auto",                        /* Control what method is used to detect module-format JS files. */

    /* Modules */
    "module": "commonjs",                                /* Specify what module code is generated. */
    // "rootDir": "./",                                  /* Specify the root folder within your source files. */
    // "moduleResolution": "node10",                     /* Specify how TypeScript looks up a file from a given module specifier. */
    // "baseUrl": "./",                                  /* Specify the base directory to resolve non-relative module names. */
    // "paths": {},                                      /* Specify a set of entries that re-map imports to additional lookup locations. */
    // "rootDirs": [],                                   /* Allow multiple folders to be treated as one when resolving modules. */
    // "typeRoots": [],                                  /* Specify multiple folders that act like './node_modules/@types'. */
    // "types": [],                                      /* Specify type package names to be included without being referenced in a source file. */
    // "allowUmdGlobalAccess": true,                     /* Allow accessing UMD globals from modules. */
    // "moduleSuffixes": [],                             /* List of file name suffixes to search when resolving a module. */
    // "allowImportingTsExtensions": true,               /* Allow imports to include TypeScript file extensions. Requires '--moduleResolution bundler' and either '--noEmit' or '--emitDeclarationOnly' to be set. */
    // "resolvePackageJsonExports": true,                /* Use the package.json 'exports' field when resolving package imports. */
    // "resolvePackageJsonImports": true,                /* Use the package.json 'imports' field when resolving imports. */
    // "customConditions": [],                           /* Conditions to set in addition to the resolver-specific defaults when resolving imports. */
    // "noUncheckedSideEffectImports": true,             /* Check side effect imports. */
    // "resolveJsonModule": true,                        /* Enable importing .json files. */
    // "allowArbitraryExtensions": true,                 /* Enable importing files with any extension, provided a declaration file is present. */
    // "noResolve": true,                                /* Disallow 'import's, 'require's or '<reference>'s from expanding the number of files TypeScript should add to a project. */

    /* JavaScript Support */
    // "allowJs": true,                                  /* Allow JavaScript files to be a part of your program. Use the 'checkJS' option to get errors from these files. */
    // "checkJs": true,                                  /* Enable error reporting in type-checked JavaScript files. */
    // "maxNodeModuleJsDepth": 1,                        /* Specify the maximum folder depth used for checking JavaScript files from 'node_modules'. Only applicable with 'allowJs'. */

    /* Emit */
    // "declaration": true,                              /* Generate .d.ts files from TypeScript and JavaScript files in your project. */
    // "declarationMap": true,                           /* Create sourcemaps for d.ts files. */
    // "emitDeclarationOnly": true,                      /* Only output d.ts files and not JavaScript files. */
    // "sourceMap": true,                                /* Create source map files for emitted JavaScript files. */
    // "inlineSourceMap": true,                          /* Include sourcemap files inside the emitted JavaScript. */
    // "noEmit": true,                                   /* Disable emitting files from a compilation. */
    // "outFile": "./",                                  /* Specify a file that bundles all outputs into one JavaScript file. If 'declaration' is true, also designates a file that bundles all .d.ts output. */
    // "outDir": "./",                                   /* Specify an output folder for all emitted files. */
    // "removeComments": true,                           /* Disable emitting comments. */
    // "importHelpers": true,                            /* Allow importing helper functions from tslib once per project, instead of including them per-file. */
    // "downlevelIteration": true,                       /* Emit more compliant, but verbose and less performant JavaScript for iteration. */
    // "sourceRoot": "",                                 /* Specify the root path for debuggers to find the reference source code. */
    // "mapRoot": "",                                    /* Specify the location where debugger should locate map files instead of generated locations. */
    // "inlineSources": true,                            /* Include source code in the sourcemaps inside the emitted JavaScript. */
    // "emitBOM": true,                                  /* Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files. */
    // "newLine": "crlf",                                /* Set the newline character for emitting files. */
    // "stripInternal": true,                            /* Disable emitting declarations that have '@internal' in their JSDoc comments. */
    // "noEmitHelpers": true,                            /* Disable generating custom helper functions like '__extends' in compiled output. */
    // "noEmitOnError": true,                            /* Disable emitting files if any type checking errors are reported. */
    // "preserveConstEnums": true,                       /* Disable erasing 'const enum' declarations in generated code. */
    // "declarationDir": "./",                           /* Specify the output directory for generated declaration files. */

    /* Interop Constraints */
    // "isolatedModules": true,                          /* Ensure that each file can be safely transpiled without relying on other imports. */
    // "verbatimModuleSyntax": true,                     /* Do not transform or elide any imports or exports not marked as type-only, ensuring they are written in the output file's format based on the 'module' setting. */
    // "isolatedDeclarations": true,                     /* Require sufficient annotation on exports so other tools can trivially generate declaration files. */
    // "allowSyntheticDefaultImports": true,             /* Allow 'import x from y' when a module doesn't have a default export. */
    "esModuleInterop": true,                             /* Emit additional JavaScript to ease support for importing CommonJS modules. This enables 'allowSyntheticDefaultImports' for type compatibility. */
    // "preserveSymlinks": true,                         /* Disable resolving symlinks to their realpath. This correlates to the same flag in node. */
    "forceConsistentCasingInFileNames": true,            /* Ensure that casing is correct in imports. */

    /* Type Checking */
    "strict": true,                                      /* Enable all strict type-checking options. */
    // "noImplicitAny": true,                            /* Enable error reporting for expressions and declarations with an implied 'any' type. */
    // "strictNullChecks": true,                         /* When type checking, take into account 'null' and 'undefined'. */
    // "strictFunctionTypes": true,                      /* When assigning functions, check to ensure parameters and the return values are subtype-compatible. */
    // "strictBindCallApply": true,                      /* Check that the arguments for 'bind', 'call', and 'apply' methods match the original function. */
    // "strictPropertyInitialization": true,             /* Check for class properties that are declared but not set in the constructor. */
    // "strictBuiltinIteratorReturn": true,              /* Built-in iterators are instantiated with a 'TReturn' type of 'undefined' instead of 'any'. */
    // "noImplicitThis": true,                           /* Enable error reporting when 'this' is given the type 'any'. */
    // "useUnknownInCatchVariables": true,               /* Default catch clause variables as 'unknown' instead of 'any'. */
    // "alwaysStrict": true,                             /* Ensure 'use strict' is always emitted. */
    // "noUnusedLocals": true,                           /* Enable error reporting when local variables aren't read. */
    // "noUnusedParameters": true,                       /* Raise an error when a function parameter isn't read. */
    // "exactOptionalPropertyTypes": true,               /* Interpret optional property types as written, rather than adding 'undefined'. */
    // "noImplicitReturns": true,                        /* Enable error reporting for codepaths that do not explicitly return in a function. */
    // "noFallthroughCasesInSwitch": true,               /* Enable error reporting for fallthrough cases in switch statements. */
    // "noUncheckedIndexedAccess": true,                 /* Add 'undefined' to a type when accessed using an index. */
    // "noImplicitOverride": true,                       /* Ensure overriding members in derived classes are marked with an override modifier. */
    // "noPropertyAccessFromIndexSignature": true,       /* Enforces using indexed accessors for keys declared using an indexed type. */
    // "allowUnusedLabels": true,                        /* Disable error reporting for unused labels. */
    // "allowUnreachableCode": true,                     /* Disable error reporting for unreachable code. */

    /* Completeness */
    // "skipDefaultLibCheck": true,                      /* Skip type checking .d.ts files that are included with TypeScript. */
    "skipLibCheck": true                                 /* Skip type checking all .d.ts files. */
  },
  "include": ["src/**/*.ts"],
}

    `;
}

const genSwaggerTs = (models: any[], projectName: string): string => {
    let content = `
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

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

    // Función recursiva para generar propiedades anidadas
    const generateProperties = (fields: Field[]): string => {
        let propertiesContent = '';
        for (const field of fields) {
            propertiesContent += `                        ${field.name}: {\n`;
            if (field.type === "object" && field.fields) {
                // Si el campo es un objeto, generar una estructura anidada
                propertiesContent += `                            type: 'object',\n`;
                propertiesContent += `                            properties: {\n`;
                propertiesContent += generateProperties(field.fields);
                propertiesContent += `                            },\n`;
            } else {
                // Si el campo es primitivo
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

    // Agregar los modelos al esquema de Swagger
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
    content += `    apis: ['./src/routes/*.ts'],\n`;
    content += `};\n\n`;

    // Función para inicializar Swagger
    content += `const swaggerDocs = (app: any) => {\n`;
    content += `    const swaggerSpec = swaggerJsdoc(options);\n`;
    content += `    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));\n`;
    content += `};\n\n`;

    content += `export default swaggerDocs;\n`;

    return content;
};


export default {
    genMongooseTSModel,
    genMongooseTSService,
    genMongooseTSInterface,
    genMongooseTSController,
    genMongooseTSRoutes,
    genMongooseTSIndex,
    genPackageJson,
    genMongooseTSDBConfig,
    gentTsConfig,
    genSwaggerTs

};
