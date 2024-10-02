"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes/routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, '../views'));
app.get('/', (req, res) => {
    res.render('index');
});
app.use('/api', routes_1.default);
const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
