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

const generateMongoConnection = (DbName: string): string => {
    return `
    import mongoose from 'mongoose';

    const dataBase: string = process.env.DB_NAME || '${DbName}';
   
    mongoose.set('strictQuery', false);

async function connectToDb(): Promise<void> {
    try {
        await mongoose.connect('mongodb://localhost:27017/' + dataBase);
        console.log('Connected to MongoDB');
    } catch (error: any) {
        console.error('Error connecting to MongoDB: ', error);
    }
}

export default connectToDb;`;
};

const generateMongoModels = (name: string, fields: Field[]): string => {
    const hasReferences: boolean = fields.some(field => field.references || (field.fields && field.fields.some(f => f.references)));

    const imports: string = `import mongoose from 'mongoose';${hasReferences ? '\nimport { ObjectId } from "mongodb";' : ''}`;

    const generateFieldDefinition = (field: Field): string => {
        if (field.type === 'Array' && field.fields) {
            const subFields: string = field.fields.map(generateFieldDefinition).join(',\n');
            return `
            ${field.name}: [{
                ${subFields}
            }]`;
        } else if (field.fields) {
            const subFields: string = field.fields.map(generateFieldDefinition).join(',\n');
            return `
            ${field.name}: {
                ${subFields}
            }`;
        }

        return `
        ${field.name}: {
            type: ${field.type},
            ${field.allowNull ? 'required: false' : 'required: true'},
            ${field.defaultValue ? `default: ${field.defaultValue},` : ''}
            ${field.unique ? 'unique: true,' : ''}
            ${field.validate ? `validate: ${JSON.stringify(field.validate)},` : ''}
            ${field.references ? `ref: '${field.references.model}'` : ''}
        }`;
    };

    const fieldsCode: string[] = fields.map(generateFieldDefinition);

    return `
    ${imports}

    const ${name}Schema = new mongoose.Schema({
        ${fieldsCode.join(',\n')}
    });

    const ${name} = mongoose.model('${name}', ${name}Schema);

    export default ${name};
    `;
}
const generatePubsub = (): string => {
    return `
    import { PubSub } from 'graphql-subscriptions';

    export const pubsub: PubSub = new PubSub();
    `;
}

const generateMutationArguments = (fields: Field[]): string => {
    let mutationArgs: string = '';
    for (let field of fields) {
        mutationArgs += `${field.name},\n`;
    }
    return mutationArgs;
}

const generateCreateMutation = (name: string, fields: Field[]): string => {
    let mutationArgs: string = generateMutationArguments(fields);
    return `
    import ${name} from '../../../models/${name}.model.ts';
    import { pubsub } from '../../../pubsub.ts';

    const create${name} = async (_: any, { ${mutationArgs} }: any): Promise<any> => {
        const new${name} = new ${name}({\n${mutationArgs} });
        await new${name}.save();
        pubsub.publish('${name}_CREATED', { ${name}Created: new${name} });
        return new${name};
    }
    
    export default create${name};
    `;
};
const generateDeleteMutation = (name: string): string => {
    return `
    import ${name} from '../../../models/${name}.model.ts';
    import { pubsub } from '../../../pubsub.ts';

    const delete${name} = async (_: any, { id }: { id: string }): Promise<any> => {
        const ${name.toLowerCase()} = await ${name}.findByIdAndDelete(id);
        pubsub.publish('${name}_DELETED', { ${name}Deleted: ${name.toLowerCase()} });
        return ${name.toLowerCase()};
    }
    
    export default delete${name};
    `;
};

const generateUpdateMutation = (name: string, fields: Field[]): string => {
    let mutationArgs: string = generateMutationArguments(fields);
    return `
    import ${name} from '../../../models/${name}.model.ts';
    import { pubsub } from '../../../pubsub.ts';

    const update${name} = async (_: any, { id, ${mutationArgs} }: any): Promise<any> => {
        const updated${name} = await ${name}.findByIdAndUpdate(id, { $set: { ${mutationArgs} } }, { new: true });
        pubsub.publish('${name}_UPDATED', { ${name}Updated: updated${name} });
        return updated${name};
    }

    export default update${name};
    `;
};

const hasReferences = (fields: Field[]): boolean =>
    fields.some(field =>
        field.references || (field.fields && hasReferences(field.fields))
    );

const getPopulateFields = (fields: Field[], prefix = ''): string[] => {
    return fields.flatMap(field => {
        const fieldPath = prefix ? `${prefix}.${field.name}` : field.name;

        if (field.references) {
            return [fieldPath];
        }

        if (field.fields) {
            return getPopulateFields(field.fields, fieldPath);
        }

        return [];
    });
};

const getReferencedModels = (fields: Field[]): Set<string> =>
    fields.reduce((models, field) => {
        if (field.references) {
            models.add(field.references.model);
        }
        if (field.fields) {
            getReferencedModels(field.fields).forEach(models.add, models);
        }
        return models;
    }, new Set<string>());

const generateGetOneQuery = (name: string, fields: Field[]): string => {
    const populateFields: string[] = getPopulateFields(fields);
    const populateString: string = populateFields.length ? `.populate('${populateFields.join(" ")}')` : '';

    const referencedModels: Set<string> = getReferencedModels(fields);
    const imports: string = Array.from(referencedModels)
        .map(model => `import ${model} from '../../../models/${model}.model.ts';`)
        .join('\n');

    return `
    import ${name} from '../../../models/${name}.model.ts';
    ${imports}
    
    const get${name} = async (_: any, { id }: { id: string }): Promise<any> => {
        return await ${name}.findById(id)${populateString};
    }
    
    export default get${name};`;
};

const generateGetAllQuery = (name: string, fields: Field[]): string => {
    const populateFields: string[] = getPopulateFields(fields);
    const populateString: string = populateFields.length ? `.populate('${populateFields.join("' '")}')`  : '';

    const referencedModels: Set<string> = getReferencedModels(fields);
    const imports: string = Array.from(referencedModels)
        .map(model => `import ${model} from '../../../models/${model}.model.ts';`)
        .join('\n');

    return `
import ${name} from '../../../models/${name}.model.ts';
${imports}

const getAll${name}s = async (): Promise<any> => {
    return await ${name}.find()${populateString};
}

export default getAll${name}s;`;
};

const generateModuleIndex = (name: string, fields: Field[]): string => {
    let moduleIndex: string = `
    import { gql } from 'apollo-server-express';
    import pkg from 'graphql-subscriptions';
    import { pubsub } from '../../pubsub.ts';
    import create${name} from './mutations/create${name}.ts';
    import delete${name} from './mutations/remove${name}.ts';
    import update${name} from './mutations/update${name}.ts';
    import get${name} from './queries/get${name}.ts';
    import getAll${name} from './queries/getAll${name}.ts';

    const { withFilter } = pkg;

    const typeDefs = gql\`
        type ${name} {
            ${fields.map(field => `${field.name}: ${field.type}`).join('\n')}
        }

        type Query {
            get${name}(id: ID!): ${name}
            getAll${name}: [${name}]
        }

        type Mutation {
            create${name}: ${name}
            delete${name}(id: ID!): ${name}
            update${name}(id: ID!): ${name}
        }

        type Subscription {
            ${name}Created: ${name}
            ${name}Deleted: ${name}
            ${name}Updated: ${name}
        }
    \`;

    function filter${name}Created(payload: any): boolean {
        return true;
    }
    function filter${name}Updated(payload: any): boolean {
        return true;
    }
    
    const resolvers = {
        Query: {
            get${name},
            getAll${name}
        },
        Mutation: {
            create${name},
            delete${name},
            update${name}
        },
        Subscription: {
            ${name}Created: {
                subscribe: withFilter(
                    () => pubsub.asyncIterator('${name}_CREATED'),
                    (payload: any, variables: any) => {
                        return payload.${name}Created.id === variables.id;
                    }
                )
            },
            ${name}Deleted: {
                subscribe: withFilter(
                    () => pubsub.asyncIterator('${name}_DELETED'),
                    (payload: any, variables: any) => {
                        return payload.${name}Deleted.id === variables.id;
                    }
                )
            },
            ${name}Updated: {
                subscribe: withFilter(
                    () => pubsub.asyncIterator('${name}_UPDATED'),
                    (payload: any, variables: any) => {
                        return payload.${name}Updated.id === variables.id;
                    }
                )
            }
        }
    };

    export { typeDefs, resolvers };
    `;
    return moduleIndex;
}

const generateModulesIndex = (modules: string[]): string => {
    const imports: string[] = modules.map(module => `import { typeDefs as ${module}TypeDefs, resolvers as ${module}Resolvers } from './${module}/index.ts';`);
    let modulesIndex: string = `
    import { gql } from 'apollo-server-express';
    import { GraphQLScalarType } from 'graphql';
    import { makeExecutableSchema } from '@graphql-tools/schema';
    import { DateScalar, ObjectIdScalar, NumberScalar, timeScalar } from './scalars.ts';

    ${imports.join('\n')}

    const typeDefs = gql\`
        scalar Date
        scalar ObjectId
        scalar Number
        scalar Time
        type Query {
            getVersions: String!
        }
        type Mutation {
            getVersion: String!
        }
    \`;
    const resolvers = {
        Date: DateScalar,
        ObjectId: ObjectIdScalar,
        Number: NumberScalar,
        Time: timeScalar,
        Query: {
            getVersions: () => 'v1',
        },
        Mutation: {
            getVersion: () => 'v1',
        },
    };

    const schema = makeExecutableSchema({
        typeDefs: [typeDefs, ${modules.map(module => `${module}TypeDefs`).join(', ')}],
        resolvers: [resolvers, ${modules.map(module => `${module}Resolvers`).join(', ')}]
    });

    export default schema;
    `;

    return modulesIndex;
}

const generateIndexGraphqlTs = (): string => {
    let index: string = `
    import { ApolloServer, ExpressContext } from 'apollo-server-express';
    import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
    import express from 'express';
    import type { Express } from 'express';
    import connectToDb from './config/db';
    import schema from './modules/index.ts';
    import { WebSocketServer, WebSocket } from 'ws';
    import http from 'http';
    import bodyParser from 'body-parser';
    import dotenv from 'dotenv';


    dotenv.config();

    const app: Express = express();
    const httpServer: http.Server = http.createServer(app);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        next();
    });
    app.disable('x-powered-by');

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(
        bodyParser.urlencoded({
            limit: "50mb",
            extended: true,
            parameterLimit: 50000,
        })
    );
   const PORT: string | number = process.env.PORT || 4000;
    const server: ApolloServer<ExpressContext> = new ApolloServer({ 
        cache: "bounded",
        schema,
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer })
        ]
    });

    const wss: WebSocketServer = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws: WebSocket) => {
        ws.on('message', (message: string) => {
            console.log(\`Received message \${message}\`);
        });
        ws.send('Hello! Message From Server!!');
    });

    async function startApolloServer(): Promise<void> {
        await server.start();
        server.applyMiddleware({ app });
       
        httpServer.listen(PORT, () => {
            console.log(\`🚀 Server ready at http://localhost:\${PORT}\${server.graphqlPath}\`);
            console.log(\`🚀 Subscriptions ready at ws://localhost:\${PORT}\`);
        });
    }
    connectToDb().then(startApolloServer);
    `;
    return index;
}

const generatePackageJson = (projectName: string): string => {
    return `
    {
        "name": "${projectName}",
        "version": "1.0.0",
        "description": "A GraphQL API project",
        "main": "index.ts",
        "scripts": {
            "dev": "nodemon --exec tsx ./src/index.ts"
        },
        "keywords": [],
        "author": "",
        "license": "ISC",
        "type": "module",
        "dependencies": {
                "@graphql-tools/schema": "^10.0.20",
                "@graphql-tools/utils": "^10.8.3",
                "apollo-server-express": "^3.4.0",
                "body-parser": "^1.19.0",
                "dotenv": "^16.0.0",
                "express": "^4.17.1",
                "graphql": "^15.3.1",
                "graphql-subscriptions": "^1.2.0",
                "http": "^0.0.1-security",
                "mongoose": "^6.0.11",
                "nodemon": "^2.0.15",
                "ws": "^8.6.0"
        },
            "devDependencies": {
                "@types/express": "^4.17.13",
                "@types/mongoose": "^5.11.97",
                "@types/node": "^16.11.7",
                "@types/ws": "^8.5.14",
                "ts-node": "^10.4.0",
                "tsx": "^4.19.3",
                "typescript": "^4.5.4"
        }
        }
    `;
}

const generateScalartypes = (): string => {
    return `
    import { GraphQLScalarType } from 'graphql';
    import { Kind } from 'graphql/language/index.js';
    import { ObjectId } from 'mongodb';

    const DateScalar: GraphQLScalarType = new GraphQLScalarType({
        name: 'Date',
        description: 'Custom Date scalar type',
        parseValue(value: any): Date {
            return new Date(value); // value from the client
        },
        serialize(value: Date): number {
            return value.getTime(); // value sent to the client
        },
        parseLiteral(ast: any): Date | null {
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10)); // ast value is always in string format
            }
            return null;
        },
    });

    const ObjectIdScalar: GraphQLScalarType = new GraphQLScalarType({
        name: 'ObjectId',
        description: 'MongoDB ObjectId scalar type',
        parseValue(value: string): ObjectId {
            return new ObjectId(value); // value from the client
        },
        serialize(value: ObjectId): string {
            return value.toString(); // value sent to the client
        },
        parseLiteral(ast: any): ObjectId | null {
            if (ast.kind === Kind.STRING) {
                return new ObjectId(ast.value); // ast value is always in string format
            }
            return null;
        },
    });

    const NumberScalar: GraphQLScalarType = new GraphQLScalarType({
        name: 'Number',
        description: 'Custom Number scalar type',
        parseValue(value: string): number {
            return parseFloat(value); // value from the client
        },
        serialize(value: number): number {
            return value; // value sent to the client
        },
        parseLiteral(ast: any): number | null {
            if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
                return parseFloat(ast.value); // ast value is always in string format
            }
            return null;
        },
    });

    const timeScalar: GraphQLScalarType = new GraphQLScalarType({
        name: 'Time',
        description: 'Time custom scalar type',
        serialize(value: any): any {
            return value;
        },
    });

    export { DateScalar, ObjectIdScalar, NumberScalar, timeScalar };`
}

const generateTsConfig = (): string => {
    let content = `{
  "compilerOptions": {
    "target": "es2016",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
  },
  "include": ["src/**/*.ts"]
}

`;

    return content;
};

export default {
    generateMongoConnection,
    generateMongoModels,
    generatePubsub,
    generateCreateMutation,
    generateDeleteMutation,
    generateUpdateMutation,
    generateGetOneQuery,
    generateGetAllQuery,
    generateModuleIndex,
    generateModulesIndex,
    generateIndexGraphqlTs,
    generatePackageJson,
    generateScalartypes,
    generateTsConfig
};
