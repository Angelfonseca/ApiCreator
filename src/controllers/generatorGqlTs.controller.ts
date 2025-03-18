import GQLService from '../services/generatorGqlTs.service';
import path from 'path';
import { createRequire } from 'module';
import fs from 'fs';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { Request, Response } from 'express';

interface Field {
    name: string;
    type: 'String' | 'Number' | 'Boolean' | 'Date' | 'ObjectId' | 'Array' | 'Mixed';
    allowNull?: boolean;
    defaultValue?: any;
    unique?: boolean;
    validate?: Record<string, any>;
    references?: { model: string; key: string };
    fields?: Field[];
}

const ensureDirExists = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const genDbConection = (name: string, dir: string) => {
    const outputDir = path.join(dir, 'config');
    ensureDirExists(outputDir);

    try {
        const dbContent = GQLService.generateMongoConnection(name);
        const filePath = path.join(outputDir, 'db.ts');
        fs.writeFileSync(filePath, dbContent);
        console.log(`Conexión a la base de datos generada en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar la conexión a la base de datos: ${error.message}`);
    }
}

const genModels = (name: string, dir: string, models: any[]) => {
    const outputDir = path.join(dir, 'models');
    ensureDirExists(outputDir);
    for (const model of models) {
        const fields = model.fields;
        const modelContent = GQLService.generateMongoModels(model.name, fields);
        const filePath = path.join(outputDir, `${model.name}.model.ts`);
        fs.writeFileSync(filePath, modelContent);
        console.log(`Modelo ${model.name} generado en ${filePath}`);
    }
}

const genPubsub = (dir: string) => {
    const outputDir = path.join(dir);
    ensureDirExists(outputDir);
    const pubsubContent = GQLService.generatePubsub();
    const filePath = path.join(outputDir, 'pubsub.ts');
    fs.writeFileSync(filePath, pubsubContent);
    console.log(`PubSub generado en ${filePath}`);
}

const genTsConfig = (dir: string) => {
    const outputDir = path.join(dir);
    ensureDirExists(outputDir);
    const tsConfigContent = GQLService.generateTsConfig();
    fs.writeFileSync(path.join(outputDir, 'tsconfig.json'), tsConfigContent);
    console.log(`tsconfig.json generado en ${outputDir}`);
    }

const createMutations = (name: string, dir: string, modelFields: Field[]) => {
    const outputDir = path.join(dir, 'mutations');
    ensureDirExists(outputDir);
    try {
        const create = GQLService.generateCreateMutation(name, modelFields);
        const update = GQLService.generateUpdateMutation(name, modelFields);
        const remove = GQLService.generateDeleteMutation(name);
        const createFilePath = path.join(outputDir, `create${capitalizeType(name)}.ts`);
        const updateFilePath = path.join(outputDir, `update${capitalizeType(name)}.ts`);
        const removeFilePath = path.join(outputDir, `remove${capitalizeType(name)}.ts`);
        fs.writeFileSync(createFilePath, create);
        fs.writeFileSync(updateFilePath, update);
        fs.writeFileSync(removeFilePath, remove);
        console.log(`Mutaciones de ${name} generadas en ${createFilePath}, ${updateFilePath} y ${removeFilePath}`);
    } catch (error: any) {
        console.error(`Error al generar las mutaciones de ${name}: ${error.message}`);
    }
}


const createQueries = (name: string, dir: string, modelFields: Field[]) => {
    const outputDir = path.join(dir, 'queries');
    ensureDirExists(outputDir);
    try {
        const get = GQLService.generateGetOneQuery(name, modelFields);
        const getAll = GQLService.generateGetAllQuery(name, modelFields);
        const getFilePath = path.join(outputDir, `get${capitalizeType(name)}.ts`);
        const getAllFilePath = path.join(outputDir, `getAll${capitalizeType(name)}.ts`);
        fs.writeFileSync(getFilePath, get);
        fs.writeFileSync(getAllFilePath, getAll);
        console.log(`Consultas de ${name} generadas en ${getFilePath} y ${getAllFilePath}`);
    } catch (error: any) {
        console.error(`Error al generar las consultas de ${name}: ${error.message}`);
    }
}
const genModuleIndex = (dir: string, fields: Field[], name: string) => {
    const outputDir = path.join(dir, 'index.ts');
    try {
        const moduleIndexContent = GQLService.generateModuleIndex(name, fields);
        fs.writeFileSync(outputDir, moduleIndexContent);
        console.log(`Index de módulo ${name} generado en ${outputDir}`);
    } catch (error: any) {
        console.error(`Error al generar el index del módulo ${name}: ${error.message}`);
    }
}

const genModule = (dir: string, name: string, fields: Field[]) => {
    try {
        const outputDir = path.join(dir, 'modules', name);
        ensureDirExists(outputDir);
        const queries = createQueries(name, outputDir, fields);
        const mutations = createMutations(name, outputDir, fields);
        const moduleIndex = genModuleIndex(outputDir, fields, name);
        console.log(`Módulo ${name} generado en ${outputDir}`);
    } catch (error: any) {
        console.error(`Error al generar el módulo ${name}: ${error.message}`);
    }
}
const genModules = (dir: string, modules: any[]) => {
    try {
        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            throw new Error('No modules provided or invalid modules array');
        }
        modules.forEach(module => {
            genModule(dir, module.name, module.fields);
        });
    } catch (error: any) {
        console.error(`Error al generar los módulos: ${error.message}`);
    }
}

const genModulesIndex = (dir: string, names: string[]) => {
    const outputDir = path.join(dir, 'modules');
    try {
        const moduleIndexContent = GQLService.generateModulesIndex(names);
        fs.writeFileSync(path.join(outputDir, 'index.ts'), moduleIndexContent);
        console.log(`Index de módulos generado en ${outputDir}`);
        } catch (error: any) {
            console.error(`Error al generar el index de módulos: ${error.message}`);
        }
}

const genIndex = (dir: string, m: string) => {
    const outputDir = path.join(dir);
    try {
        const indexContent = GQLService.generateIndexGraphqlTs();
        fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);
        console.log(`Index generado en ${outputDir}`);
    }
    catch (error: any) {
        console.error(`Error al generar el index: ${error.message}`);
    }
}

const genPackageJson = (projectName: string, dir: string) => {
    try {
        const packageJson = GQLService.generatePackageJson(projectName);
        fs.writeFileSync(path.join(dir, 'package.json') , packageJson);
        console.log(`Package.json generado en ${dir}`);
    } catch (error: any) {
        console.error(`Error al generar el package.json: ${error.message}`);
    }
}

const generateScalartypes = (dir: string) => {
    try {
        const outputDir = path.join(dir, 'modules');
        const scalartypes = GQLService.generateScalartypes();
        fs.writeFileSync(path.join(outputDir, 'scalars.ts'), scalartypes);
        console.log(`Scalar types generado en ${dir}`);
        } catch (error: any) {
            console.error(`Error al generar los scalar types: ${error.message}`);
        }
}


const createProject = async (req: Request, res: Response) => {
    const projectName = req.body.projectName;
    const models = req.body.models;
    const outputBaseDir = path.join(__dirname, '..', '..', '..', 'outputs');
    const projectDir = path.join(outputBaseDir, projectName);
    console.log('Creating project...');
    ensureDirExists(outputBaseDir);

    try {
        // Create project files
        const srcDir = path.join(projectDir, 'src');
        ensureDirExists(srcDir);
        genIndex(srcDir, projectName);
        genModules(srcDir, models);
        genModulesIndex(srcDir, models.map((m: { name: string }) => m.name));
        genModels(projectName, srcDir, models);
        genDbConection(projectName, srcDir);
        genPubsub(srcDir);
        generateScalartypes(srcDir);
        genIndex(srcDir, projectName);
        genTsConfig(projectDir);
        genPackageJson(projectName, projectDir);

        // Create zip file
        const zipPath = path.join(outputBaseDir, `${projectName}.zip`);
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            // Delete the project directory after zipping
            fs.rmSync(projectDir, { recursive: true, force: true });
            console.log(`Project ${projectName} created and zipped successfully`);
            res.download(zipPath, `${projectName}.zip`, (err) => {
                if (err) {
                    console.error(`Error sending zip file: ${err.message}`);
                }
                // Delete the zip file after sending
                fs.unlinkSync(zipPath);
            });
        });

        archive.pipe(output);
        archive.directory(projectDir, projectName);
        await archive.finalize();

    } catch (error: any) {
        console.error(`Error creating project: ${error.message}`);
        res.status(500).send({ message: `Error creating project: ${error.message}` });
    }
}

export default {
    createProject
};

