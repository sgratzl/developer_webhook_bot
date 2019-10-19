"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_lambda_1 = require("@probot/serverless-lambda");
const github_1 = __importDefault(require("./github"));
const telegram_1 = __importDefault(require("./telegram"));
exports.probot = serverless_lambda_1.serverless(github_1.default);
exports.telegram = async (event) => {
    const body = event.body[0] === '{' ? JSON.parse(event.body) : JSON.parse(Buffer.from(event.body, 'base64').toString());
    await telegram_1.default.handleUpdate(body);
    return { statusCode: 200, body: '' };
};
