"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generator_controller_1 = __importDefault(require("../controllers/generator.controller"));
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/generate', generator_controller_1.default.createProject);
exports.default = router;
