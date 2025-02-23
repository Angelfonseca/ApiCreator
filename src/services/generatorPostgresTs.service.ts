
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

const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

const genTsModel = (name: string, fields: Field[]): string => {
    let content = `import { DataTypes, Model, Optional } from 'sequelize';\n`;
    content += `import {sequelize} from '../config/sequelize.config';\n\n`;

    for (const field of fields) {
        if (field.references) {
            content += `import ${field.references.model} from './${field.references.model}.model';\n`;
        }
    }

    content += `export interface ${capitalize(name)}Attributes {\n`;
    content += `  id: number;\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += `  ${field.name}: ${field.type.toLowerCase()};\n`;
    }
    content += `}\n\n`;

    content += `export interface ${capitalize(name)}CreationAttributes extends Optional<${capitalize(name)}Attributes, 'id'> {}\n\n`;

    content += `class ${capitalize(name)} extends Model<${capitalize(name)}Attributes, ${capitalize(name)}CreationAttributes> implements ${capitalize(name)}Attributes {\n`;
    content += `  public id!: number;\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += `  public ${field.name}!: ${field.type.toLowerCase()};\n`;
    }
    content += `}\n\n`;

    content += `${capitalize(name)}.init(\n`;
    content += `  {\n`;
    content += `    id: {\n`;
    content += `      type: DataTypes.INTEGER,\n`;
    content += `      primaryKey: true,\n`;
    content += `      autoIncrement: true,\n`;
    content += `    },\n`;
    for (const field of fields) {
        if (field.name === 'id') continue;
        content += `    ${field.name}: {\n`;
        content += `      type: ${field.references ? 'DataTypes.INTEGER' : `DataTypes.${field.type}`},\n`;
        if (field.allowNull !== undefined) {
            content += `      allowNull: ${field.allowNull},\n`;
        }
        if (field.defaultValue !== undefined) {
            content += `      defaultValue: ${JSON.stringify(field.defaultValue)},\n`;
        }
        if (field.references) {
            content += `      references: {\n`;
            content += `        model: ${field.references.model},\n`;
            content += `        key: '${field.references.key}'\n`;
            content += `      },\n`;
        }
        content += `    },\n`;
    }
    content += `  },\n`;
    content += `  {\n`;
    content += `    sequelize,\n`;
    content += `    modelName: '${name}',\n`;
    content += `    timestamps: true,\n`;
    content += `  }\n`;
    content += `);\n\n`;

    content += `export default ${capitalize(name)};\n`;

    return content;
};

const genTsService = (name: string): string => {
    const capitalizedName = capitalize(name);

    let content = `import  ${capitalize(name)}  from '../models/${name}.model';\n\n`;

    content += `export const getAll = async () => {\n`;
    content += `  try {\n`;
    content += `    return await ${capitalizedName}.findAll();\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error fetching ${capitalizedName}s: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const create = async (data: any) => {\n`;
    content += `  try {\n`;
    content += `    const newRecord = await ${capitalizedName}.create(data);\n`;
    content += `    return await ${capitalizedName}.findByPk(newRecord.id);\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error creating ${capitalizedName}: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const bulkCreate = async (data: any[]) => {\n`;
    content += `  try {\n`;
    content += `    return await ${capitalizedName}.bulkCreate(data);\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error bulk creating ${capitalizedName}s: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const findOrCreate = async (data: any) => {\n`;
    content += `  try {\n`;
    content += `    const [record, created] = await ${capitalizedName}.findOrCreate({\n`;
    content += `      where: data,\n`;
    content += `      defaults: data\n`;
    content += `    });\n`;
    content += `    return { record, created };\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error finding or creating ${capitalizedName}: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const getById = async (id: number) => {\n`;
    content += `  try {\n`;
    content += `    const record = await ${capitalizedName}.findByPk(id);\n`;
    content += `    if (!record) {\n`;
    content += `      throw new Error(\`${capitalizedName} with id \${id} not found\`);\n`;
    content += `    }\n`;
    content += `    return record;\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error fetching ${capitalizedName}: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const updateById = async (id: number, data: any) => {\n`;
    content += `  try {\n`;
    content += `    const record = await ${capitalizedName}.findByPk(id);\n`;
    content += `    if (!record) {\n`;
    content += `      throw new Error(\`${capitalizedName} with id \${id} not found\`);\n`;
    content += `    }\n`;
    content += `    await record.update(data);\n`;
    content += `    return await ${capitalizedName}.findByPk(id);\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error updating ${capitalizedName}: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const deleteById = async (id: number) => {\n`;
    content += `  try {\n`;
    content += `    const record = await ${capitalizedName}.findByPk(id);\n`;
    content += `    if (!record) {\n`;
    content += `      throw new Error(\`${capitalizedName} with id \${id} not found\`);\n`;
    content += `    }\n`;
    content += `    await record.destroy();\n`;
    content += `    return { success: true, message: \`${capitalizedName} deleted successfully\` };\n`;
    content += `  } catch (error: any) {\n`;
    content += `    throw new Error(\`Error deleting ${capitalizedName}: \${error.message}\`);\n`;
    content += `  }\n`;
    content += `};\n`;

    return content;
};

const genSequelizeConfig = (config: DbConfig): string => {
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
    content += `        host: '${config.host}',\n`;
    content += `        port: ${config.port},\n`;
    content += `        dialect: 'postgres',\n`;
    content += `    });\n\n`;
    content += `const databaseExists = async (dbName: string): Promise<boolean> => {\n`;
    content += `    try {\n`;
    content += `        const [results] = await tempSequelize.query(\n`;
    content += `            \`SELECT 1 FROM pg_database WHERE datname = '\${dbName}'\`\n`;
    content += `        );\n`;
    content += `        await tempSequelize.close();\n`;
    content += `        return results.length > 0;\n`;
    content += `    } catch (error) {\n`;
    content += `        console.error('Error checking database existence:', error);\n`;
    content += `        await tempSequelize.close();\n`;
    content += `        return false;\n`;
    content += `    }\n`;
    content += `};\n\n`;
    content += `export async function createDatabaseIfNotExists(): Promise<void> {\n`;
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
    content += `    } catch (error: any) {\n`;
    content += `        console.error('Error creating database:', error);\n`;
    content += `    } finally {\n`;
    content += `        await tempSequelize.close();\n`;
    content += `    }\n`;
    content += `}\n\n`;
    content += `export { sequelize };\n`;
    return content;
};

const genTsController = (name: string): string => {
    const capitalizedName = capitalize(name);

    let content = `import { Request, Response } from 'express';\n`;
    content += `import { getAll, create, getById, updateById, deleteById, bulkCreate, findOrCreate } from '../services/${name}.service';\n\n`;

    content += `export const getAllController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const data = await getAll();\n`;
    content += `    res.status(200).json({ success: true, data });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(500).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const createController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const data = req.body;\n`;
    content += `    const record = await create(data);\n`;
    content += `    res.status(201).json({ success: true, data: record });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(400).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const bulkCreateController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const data = req.body;\n`;
    content += `    const records = await bulkCreate(data);\n`;
    content += `    res.status(201).json({ success: true, data: records });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(400).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const findOrCreateController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const data = req.body;\n`;
    content += `    const result = await findOrCreate(data);\n`;
    content += `    res.status(201).json({ success: true, data: result });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(400).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const getByIdController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const { id } = req.params;\n`;
    content += `    const record = await getById(Number(id));\n`;
    content += `    res.status(200).json({ success: true, data: record });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(404).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `export const updateByIdController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const { id } = req.params;\n`;
    content += `    const data = req.body;\n`;
    content += `    const record = await updateById(Number(id), data);\n`;
    content += `    res.status(200).json({ success: true, data: record });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(400).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n\n`;
    content += `export const deleteByIdController = async (req: Request, res: Response) => {\n`;
    content += `  try {\n`;
    content += `    const { id } = req.params;\n`;
    content += `    await deleteById(Number(id));\n`;
    content += `    res.status(200).json({ success: true, message: '${capitalizedName} deleted successfully' });\n`;
    content += `  } catch (error: any) {\n`;
    content += `    res.status(400).json({ success: false, error: error.message });\n`;
    content += `  }\n`;
    content += `};\n`;

    return content;
};

const genTsRoutes = (name: string): string => {
    const capitalizedName = capitalize(name);

    let content = `import express from 'express';\n`;
    content += `import { getAllController, createController, getByIdController, updateByIdController, deleteByIdController, bulkCreateController, findOrCreateController } from '../controllers/${name}.controller';\n\n`;

    content += `const router = express.Router();\n\n`;

    // Swagger documentation for GET all records
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}:\n`;
    content += ` *   get:\n`;
    content += ` *     summary: Get all ${name} records\n`;
    content += ` *     description: Returns a list of all ${name} records.\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Successfully retrieved records list.\n`;
    content += ` */\n`;
    content += `router.get('/', getAllController);\n\n`;

    // Swagger documentation for POST create record
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}:\n`;
    content += ` *   post:\n`;
    content += ` *     summary: Create a new ${name} record\n`;
    content += ` *     description: Creates a new ${name} record with provided data.\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       201:\n`;
    content += ` *         description: Record created successfully.\n`;
    content += ` */\n`;
    content += `router.post('/', createController);\n\n`;

    // Swagger documentation for POST bulk create
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/bulk:\n`;
    content += ` *   post:\n`;
    content += ` *     summary: Create multiple ${name} records\n`;
    content += ` *     description: Creates multiple ${name} records with provided data.\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             type: array\n`;
    content += ` *             items:\n`;
    content += ` *               $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       201:\n`;
    content += ` *         description: Records created successfully.\n`;
    content += ` */\n`;
    content += `router.post('/bulk', bulkCreateController);\n\n`;

    // Swagger documentation for POST find or create
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/findOrCreate:\n`;
    content += ` *   post:\n`;
    content += ` *     summary: Find or create ${name} record\n`;
    content += ` *     description: Finds a ${name} record based on criteria or creates it if not found.\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Record found or created successfully.\n`;
    content += ` */\n`;
    content += `router.post('/findOrCreate', findOrCreateController);\n\n`;

    // Swagger documentation for GET by ID
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/{id}:\n`;
    content += ` *   get:\n`;
    content += ` *     summary: Get ${name} by ID\n`;
    content += ` *     description: Returns a single ${name} record by ID.\n`;
    content += ` *     parameters:\n`;
    content += ` *       - in: path\n`;
    content += ` *         name: id\n`;
    content += ` *         required: true\n`;
    content += ` *         schema:\n`;
    content += ` *           type: integer\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Record found successfully.\n`;
    content += ` *       404:\n`;
    content += ` *         description: Record not found.\n`;
    content += ` */\n`;
    content += `router.get('/:id', getByIdController);\n\n`;

    // Swagger documentation for PUT update
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/{id}:\n`;
    content += ` *   put:\n`;
    content += ` *     summary: Update ${name} by ID\n`;
    content += ` *     description: Updates a ${name} record by ID.\n`;
    content += ` *     parameters:\n`;
    content += ` *       - in: path\n`;
    content += ` *         name: id\n`;
    content += ` *         required: true\n`;
    content += ` *         schema:\n`;
    content += ` *           type: integer\n`;
    content += ` *     requestBody:\n`;
    content += ` *       required: true\n`;
    content += ` *       content:\n`;
    content += ` *         application/json:\n`;
    content += ` *           schema:\n`;
    content += ` *             $ref: '#/components/schemas/${capitalizedName}'\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Record updated successfully.\n`;
    content += ` *       404:\n`;
    content += ` *         description: Record not found.\n`;
    content += ` */\n`;
    content += `router.put('/:id', updateByIdController);\n\n`;

    // Swagger documentation for DELETE
    content += `/**\n`;
    content += ` * @swagger\n`;
    content += ` * /api/${name}/{id}:\n`;
    content += ` *   delete:\n`;
    content += ` *     summary: Delete ${name} by ID\n`;
    content += ` *     description: Deletes a ${name} record by ID.\n`;
    content += ` *     parameters:\n`;
    content += ` *       - in: path\n`;
    content += ` *         name: id\n`;
    content += ` *         required: true\n`;
    content += ` *         schema:\n`;
    content += ` *           type: integer\n`;
    content += ` *     responses:\n`;
    content += ` *       200:\n`;
    content += ` *         description: Record deleted successfully.\n`;
    content += ` *       404:\n`;
    content += ` *         description: Record not found.\n`;
    content += ` */\n`;
    content += `router.delete('/:id', deleteByIdController);\n\n`;

    content += `export default router;\n`;
    return content;
};

const genTsIndex = (names: string[], projectName: string): string => {
    let content = `import express from 'express';\n`;
    content += `import cors from 'cors';\n`;
    content += `import dotenv from 'dotenv';\n`;
    content += `import { sequelize, createDatabaseIfNotExists } from './config/sequelize.config';\n\n`;
    content += `import swaggerDocs from './swagger';`;
    for (const name of names) {
        content += `import ${name} from './models/${name}.model';\n`;
    }

    content += `// Load environment variables\n`;
    content += `dotenv.config();\n\n`;

    content += `// Initialize express app\n`;
    content += `const app = express();\n\n`;

    content += `// Middleware configuration\n`;
    content += `app.use(cors());\n`;
    content += `app.use(express.json());\n\n`;
    content += `swaggerDocs(app);\n`;
    content += `// Database synchronization\n`;
    content += `const initializeDatabase = async () => {\n`;
    content += `  try {\n`;
    content += `    await createDatabaseIfNotExists();\n`;
    content += `    console.log('Database connection established');\n`;
    content += `    await sequelize.sync({ force: true }); // Usar { force: true } solo en desarrollo\n`;
    content += `    console.log('Database synchronized successfully');\n`;
    content += `  } catch (error) {\n`;
    content += `    console.error('Database initialization failed:', error);\n`;
    content += `    process.exit(1);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `// API Routes\n`;
    names.forEach((name) => {
        content += `import ${name}Routes from './routes/${name}.routes';\n`;
    });
    content += `\n`;
    names.forEach((name) => {
        content += `app.use('/api/${name}', ${name}Routes);\n`;
    });

    content += `\n// Start server\n`;
    content += `const PORT = process.env.PORT || 3000;\n`;
    content += `const startServer = async () => {\n`;
    content += `  try {\n`;
    content += `    await initializeDatabase();\n`;
    content += `    app.listen(PORT, () => {\n`;
    content += `      console.log(\`Server running on port \${PORT}\`);\n`;
    content += `    });\n`;
    content += `  } catch (error) {\n`;
    content += `    console.error('Server startup failed:', error);\n`;
    content += `    process.exit(1);\n`;
    content += `  }\n`;
    content += `};\n\n`;

    content += `startServer();\n`;

    return content;
};

const genTsConfig = (): string => {
    let content = `{
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

    return content;
};

const genPackageJson = (projectName: string): string => {
    let content = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "ts-node src/index.ts",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "pg": "^8.13.3",
    "sequelize": "^6.6.5",
    "sequelize-cli": "^6.2.0",
    "ts-node": "^10.4.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^4.6.3",
    "typescript": "^4.4.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.12",
    "@types/express": "^4.17.13",
    "@types/node": "^16.11.7",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.8",
    "@types/sequelize": "^4.28.10"
  }
}
`;

    return content;
};


const genSwaggerTs = (modelos: any, projectName: string): string => {
    let content = `
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi = from 'swagger-ui-express';

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
content += `                 },\n`;
content += `             }\n`;
content += `        },\n`;
content += `        apis: ['./src/routes/*.js'],\n`;
content += `    }\n`;
content += `};\n`;
content += `    const swaggerDocs = (app: Express) => {\n`;
content += `        const swaggerDocument = swaggerJsdoc(options);\n`;
content += `        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));\n`;
content += `    };\n`;
content += `    export default = swaggerDocs;\n`;
return content;
};

export default {
    genTsModel,
    genTsService,
    genTsController,
    genTsRoutes,
    genTsIndex,
    genTsConfig,
    genPackageJson,
    genSequelizeConfig,
    genSwaggerTs,

};