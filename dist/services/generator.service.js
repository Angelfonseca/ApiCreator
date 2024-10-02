"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genModel = (name, fields) => {
    const fieldLines = fields.map(field => field.ref ? `${field.name}: ${field.type} | ${field.ref};` : `${field.name}: ${field.type.charAt(0).toUpperCase()};`).join('\n');
    const schemaLines = fields.map(field => field.ref ? `${field.name}: { type: Schema.Types.ObjectId, ref: '${field.ref}' }` : `${field.name}: { type: ${field.type.charAt(0).toUpperCase() + field.type.slice(1)} }`).join(',\n');
    return `
import { Schema, model } from 'mongoose';
import { ${name} } from '../interfaces/${name}.interface';
export const ${name}Model = new Schema<${name}>({
    ${schemaLines}
});

export default model<${name}>('${name}', ${name}Model);
`;
};
const genModelInterface = (name, fields) => {
    const interfaceLines = fields.map(field => field.name + ': ' + field.type.charAt(0).toUpperCase() + field.type.slice(1) + ';').join('\n');
    return `
export interface ${name} {
    ${interfaceLines}
}
`;
};
const genServices = (name, fields) => {
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
const genControllers = (name, fields) => {
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
const genRoutes = (name) => {
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
const genIndex = (names, projectName) => {
    const imports = names.map(name => `import ${name}Routes from '../src/routes/${name}.routes';`).join('\n');
    const routes = names.map(name => `app.use('/${name}', ${name}Routes);`).join('\n');
    return `
import express from 'express';
import mongoose from 'mongoose';

const app = express();

app.use(express.json());

mongoose.set('strictQuery', true);
mongoose.connect('mongodb://localhost:27017/${projectName}')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

${imports}

${routes}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
`;
};
const genPackageJson = (name) => {
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
const generateBat = (name) => {
    return `
echo instalando dependencias
npm install
echo iniciando servidor
npm run dev
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
};
exports.default = {
    genModel,
    genServices,
    genModelInterface,
    genControllers,
    genRoutes,
    genIndex,
    genPackageJson,
    generateBat,
    gentTsConfig
};
