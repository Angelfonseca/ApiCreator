"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generator_service_1 = __importDefault(require("../services/generator.service"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const genModels = (modelos, dir) => {
    const outputDir = path_1.default.join(dir, 'models');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const modelContent = generator_service_1.default.genModel(name, fields);
        const filePath = path_1.default.join(outputDir, `${name}.model.ts`);
        fs_1.default.writeFileSync(filePath, modelContent);
        console.log(`Modelo ${name} generado en ${filePath}`);
    }
};
const genServices = (modelos, dir) => {
    const outputDir = path_1.default.join(dir, 'services');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const serviceContent = generator_service_1.default.genServices(name, fields);
        if (typeof serviceContent !== 'string') {
            console.error(`Error al generar el servicio para ${name}: el contenido es undefined.`);
            continue;
        }
        const filePath = path_1.default.join(outputDir, `${name}.service.ts`);
        fs_1.default.writeFileSync(filePath, serviceContent);
        console.log(`Servicio ${name} generado en ${filePath}`);
    }
};
const genModelInterface = (modelos, dir) => {
    const outputDir = path_1.default.join(dir, 'interfaces');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const interfaceContent = generator_service_1.default.genModelInterface(name, fields);
        const filePath = path_1.default.join(outputDir, `${name}.interface.ts`);
        fs_1.default.writeFileSync(filePath, interfaceContent);
        console.log(`Interface ${name} generado en ${filePath}`);
    }
};
const genControllers = (modelos, dir) => {
    const outputDir = path_1.default.join(dir, 'controllers');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const controllerContent = generator_service_1.default.genControllers(name, fields);
        const filePath = path_1.default.join(outputDir, `${name}.controller.ts`);
        fs_1.default.writeFileSync(filePath, controllerContent);
        console.log(`Controlador ${name} generado en ${filePath}`);
    }
};
const genPackageJson = (projectName) => {
    return generator_service_1.default.genPackageJson(projectName);
};
const genRoutes = (modelos, dir) => {
    const outputDir = path_1.default.join(dir, 'routes');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    for (const modelo of modelos) {
        const name = modelo.name;
        const routesContent = generator_service_1.default.genRoutes(name);
        const filePath = path_1.default.join(outputDir, `${name}.routes.ts`);
        fs_1.default.writeFileSync(filePath, routesContent);
        console.log(`Rutas ${name} generadas en ${filePath}`);
    }
};
const genIndex = (modelos, dir, projectName) => {
    const outputDir = path_1.default.join(dir, 'index.ts');
    const names = modelos.map(modelo => modelo.name);
    const indexContent = generator_service_1.default.genIndex(names, projectName);
    fs_1.default.writeFileSync(outputDir, indexContent);
    console.log(`Index generado en ${outputDir}`);
};
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { modelos, projectName } = req.body;
    if (!modelos || !projectName) {
        res.status(400).send('Faltan datos');
        return;
    }
    const outputBaseDir = path_1.default.join(__dirname, '..', '..', '..', 'outputs');
    console.log(`Output base directory: ${outputBaseDir}`);
    if (!fs_1.default.existsSync(outputBaseDir)) {
        fs_1.default.mkdirSync(outputBaseDir, { recursive: true });
        console.log(`Directorio creado: ${outputBaseDir}`);
    }
    const projectDir = path_1.default.join(outputBaseDir, projectName);
    console.log(`Project directory: ${projectDir}`);
    if (!fs_1.default.existsSync(projectDir)) {
        fs_1.default.mkdirSync(projectDir);
        console.log(`Directorio del proyecto creado: ${projectDir}`);
    }
    const srcDir = path_1.default.join(projectDir, 'src');
    console.log(`Source directory: ${srcDir}`);
    if (!fs_1.default.existsSync(srcDir)) {
        fs_1.default.mkdirSync(srcDir);
        console.log(`Directorio src creado: ${srcDir}`);
    }
    try {
        genModels(modelos, srcDir);
        genServices(modelos, srcDir);
        genControllers(modelos, srcDir);
        genModelInterface(modelos, srcDir);
        genRoutes(modelos, srcDir);
        genIndex(modelos, srcDir, projectName);
        const packageJsonContent = genPackageJson(projectName);
        fs_1.default.writeFileSync(path_1.default.join(projectDir, 'package.json'), packageJsonContent);
        console.log(`package.json creado en: ${projectDir}`);
        const bat = generator_service_1.default.generateBat(projectName);
        fs_1.default.writeFileSync(path_1.default.join(projectDir, 'start.bat'), bat);
        console.log(`start.bat creado en: ${projectDir}`);
        const tsconfig = generator_service_1.default.gentTsConfig();
        fs_1.default.writeFileSync(path_1.default.join(projectDir, 'tsconfig.json'), tsconfig);
        console.log(`tsconfig.json creado en: ${projectDir}`);
        const zipFilePath = path_1.default.join(outputBaseDir, `${projectName}.zip`);
        console.log(`Ruta del archivo ZIP: ${zipFilePath}`);
        const output = fs_1.default.createWriteStream(zipFilePath);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 }
        });
        output.on('close', () => {
            console.log(`Archivo ZIP creado: ${zipFilePath} (${archive.pointer()} bytes)`);
            res.download(zipFilePath, `${projectName}.zip`, (err) => {
                if (err) {
                    console.error('Error al enviar el archivo:', err);
                    res.status(500).send('Error al descargar el archivo');
                    return;
                }
                fs_1.default.unlinkSync(zipFilePath);
                console.log(`Archivo ZIP eliminado: ${zipFilePath}`);
                fs_1.default.rmSync(projectDir, { recursive: true, force: true });
                console.log(`Directorio del proyecto eliminado: ${projectDir}`);
            });
        });
        output.on('end', () => {
            console.log('Data has been drained');
        });
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            }
            else {
                throw err;
            }
        });
        archive.on('error', (err) => {
            console.error('Error en el archivo ZIP:', err);
            res.status(500).send('Error al crear el archivo ZIP');
        });
        archive.pipe(output);
        archive.directory(projectDir, false);
        yield archive.finalize();
    }
    catch (error) {
        console.error('Error durante la creación del proyecto:', error);
        res.status(500).send('Error al crear el proyecto');
    }
});
exports.default = {
    createProject
};
