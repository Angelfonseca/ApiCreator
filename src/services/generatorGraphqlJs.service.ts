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

const generateMongoConnection = (DbName: string) => {
    return `
    import mongoose from 'mongoose';

    const dataBase = process.env.DB_NAME || '${DbName}';
    async function connectToDb() {
        try {
            await mongoose.connect('mongodb://localhost:27017/' + dataBase);
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('Error connecting to MongoDB: ', error);
        }
    }
    export default connectToDb;
    `;
};

const generateMongoModels = (name: string, fields: Field[]) => {
    // Check if any field has references
    const hasReferences = fields.some(field => field.references || (field.fields && field.fields.some(f => f.references)));

    const imports = `import mongoose from 'mongoose';${hasReferences ? '\nimport { ObjectId } from "mongodb";' : ''}`;

    const generateFieldDefinition = (field: Field): string => {
        if (field.type === 'Array' && field.fields) {
            // Handle array of objects
            const subFields = field.fields.map(generateFieldDefinition).join(',\n');
            return `
            ${field.name}: [{
                ${subFields}
            }]`;
        } else if (field.fields) {
            // Handle nested objects
            const subFields = field.fields.map(generateFieldDefinition).join(',\n');
            return `
            ${field.name}: {
                ${subFields}
            }`;
        }

        // Handle basic fields
        let validateString = '';
        if (field.validate) {
            if (field.validate.isIn) {
                // Convert isIn to a custom validator
                validateString = `validate: {
                    validator: function (v) {
                        return ${JSON.stringify(field.validate.isIn)}.includes(v);
                    },
                    message: props => \`\${props.value} no es un valor válido. Los valores permitidos son: ${JSON.stringify(field.validate.isIn)}.\`
                },`;
            } else {
                validateString = `validate: ${JSON.stringify(field.validate)},`;
            }
        }

        return `
        ${field.name}: {
            type: ${field.type === 'Array' ? '[]' : field.type},
            ${field.allowNull ? 'required: false' : 'required: true'},
            ${field.defaultValue ? `default: ${field.defaultValue},` : ''}
            ${field.unique ? 'unique: true,' : ''}
            ${validateString}
            ${field.references ? `ref: '${field.references.model}'` : ''}
        }`;
    };

    const fieldsCode = fields.map(generateFieldDefinition);

    return `
    ${imports}

    const ${name}Schema = new mongoose.Schema({
        ${fieldsCode.join(',\n')}
    });

    const ${name} = mongoose.model('${name}', ${name}Schema);

    export default ${name};
    `;
}

const generatePubsub = () => {
    return `
    import { PubSub } from 'graphql-subscriptions';

    export const pubsub = new PubSub();
    `;
}

const generateMutationArguments = (fields: Field[]): string => {
    let mutationArgs = '';
    for (let field of fields) {
        mutationArgs += `${field.name},\n`;
    }
    return mutationArgs;
}

const generateCreateMutation = (name: string, fields: Field[]) => {
    let mutationArgs = generateMutationArguments(fields);
    return `
    import ${name} from '../../../models/${name}.model.js';
    import { pubsub } from '../../../pubsub.js';

    const create${name} = async (_, { ${mutationArgs} }) => {
        const new${name} = new ${name}({\n${mutationArgs} });
        await new${name}.save();
        pubsub.publish('${name}_CREATED', { ${name}Created: new${name} });
        return new${name};
    }
    
    export default create${name};
    `;
};

const generateDeleteMutation = (name: string) => {
    return `
    import ${name} from '../../../models/${name}.model.js';
    import { pubsub } from '../../../pubsub.js';

    const delete${name} = async (_, { id }) => {
        const ${name.toLowerCase()} = await ${name}.findByIdAndDelete(id);
        pubsub.publish('${name}_DELETED', { ${name}Deleted: ${name.toLowerCase()} });
        return ${name.toLowerCase()};
    }
    
    export default delete${name};
    `;
};

const generateUpdateMutation = (name: string, fields: Field[]) => {
    let mutationArgs = generateMutationArguments(fields);
    return `
    import ${name} from '../../../models/${name}.model.js';
    import { pubsub } from '../../../pubsub.js';

    const update${name} = async (_, { id, ${mutationArgs} }) => {
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

const generateGetOneQuery = (name: string, fields: Field[]) => {
    const populateFields = getPopulateFields(fields);
    const populateString = populateFields.length ? `.populate('${populateFields.join(" ")}')` : '';

    const referencedModels = getReferencedModels(fields);
    const imports = Array.from(referencedModels)
        .map(model => `import ${model} from '../../../models/${model}.model.js';`)
        .join('\n');

    return `
import ${name} from '../../../models/${name}.model.js';
${imports}

const get${name} = async (_, { id }) => {
    return await ${name}.findById(id)${populateString};
}

export default get${name};`;
};

const generateGetAllQuery = (name: string, fields: Field[]) => {
    const populateFields = getPopulateFields(fields);
    const populateString = populateFields.length ? `.populate('${populateFields.join(" ")}')` : '';

    const referencedModels = getReferencedModels(fields);
    const imports = Array.from(referencedModels)
        .map(model => `import ${model} from '../../../models/${model}.model.js';`)
        .join('\n');

    return `
import ${name} from '../../../models/${name}.model.js';
${imports}

const getAll${name}s = async () => {
    return await ${name}.find()${populateString};
}

export default getAll${name}s;`;
};

const generateModuleIndex = (name: string, fields: Field[]) => {
    // Helper function to map MongoDB types to GraphQL types
    const mapTypeToGraphQL = (field: Field): string => {
        switch (field.type) {
            case 'String': return 'String';
            case 'Number': return 'Float';
            case 'Boolean': return 'Boolean';
            case 'Date': return 'Date';
            case 'ObjectId': return 'ID';
            case 'Mixed': return 'JSON';
            case 'Array':
                if (field.fields && field.fields.length > 0) {
                    // If it's an array of objects or references
                    return `[${mapTypeToGraphQL(field.fields[0])}]`;
                } else {
                    // Default to String array if no fields specified
                    return '[String]';
                }
            default: return field.references ? field.references.model : 'String';
        }
    };

    const typeDefs = `
    type ${name} {
        id: ID!
        ${fields.map(field => {
            if (field.type === 'Array' && field.fields) {
                // Array of objects/references
                const innerType = mapTypeToGraphQL(field.fields[0]);
                return `${field.name}: [${innerType}]`;
            } else if (field.fields) {
                // Nested object
                return `${field.name}: ${field.references?.model || 'Object'}`;
            } else {
                // Basic field
                const graphqlType = mapTypeToGraphQL(field);
                return `${field.name}: ${field.allowNull ? graphqlType : graphqlType + '!'}`;
            }
        }).join('\n')}
    }

    type Query {
        get${name}(id: ID!): ${name}
        getAll${name}s: [${name}]
    }

    type Mutation {
        create${name}(${fields.map(field => {
            const graphqlType = mapTypeToGraphQL(field);
            return `${field.name}: ${field.allowNull ? graphqlType : graphqlType + '!'}`;
        }).join(', ')}): ${name}
        delete${name}(id: ID!): ${name}
        update${name}(id: ID!, ${fields.map(field => {
            const graphqlType = mapTypeToGraphQL(field);
            return `${field.name}: ${graphqlType}`;
        }).join(', ')}): ${name}
    }

    type Subscription {
        ${name}Created: ${name}
        ${name}Deleted: ${name}
        ${name}Updated: ${name}
    }
    `;

    return `
    import { gql } from 'apollo-server-express';
    import { withFilter } from 'graphql-subscriptions';
    import { pubsub } from '../../pubsub.js';
    import create${name} from './mutations/create${name}.js';
    import delete${name} from './mutations/remove${name}.js';
    import update${name} from './mutations/update${name}.js';
    import get${name} from './queries/get${name}.js';
    import getAll${name}s from './queries/getAll${name}.js';

    export const typeDefs = gql\`${typeDefs}\`;

    export const resolvers = {
        Query: {
            get${name},
            getAll${name}s
        },
        Mutation: {
            create${name},
            delete${name},
            update${name}
        },
        Subscription: {
            ${name}Created: {
                subscribe: () => pubsub.asyncIterator('${name}_CREATED')
            },
            ${name}Deleted: {
                subscribe: () => pubsub.asyncIterator('${name}_DELETED')
            },
            ${name}Updated: {
                subscribe: () => pubsub.asyncIterator('${name}_UPDATED')
            }
        }
    };
    `;
}

const generateModulesIndex = (modules: string[]) => {
    const imports = modules.map(module => `import { typeDefs as ${module}TypeDefs, resolvers as ${module}Resolvers } from './${module}/index.js';`);
    return `
    import { gql } from 'apollo-server-express';
    import { makeExecutableSchema } from '@graphql-tools/schema';
    import { DateScalar, ObjectIdScalar, NumberScalar, timeScalar, JSONScalar } from '../scalars.js';

    ${imports.join('\n')}

    const typeDefs = gql\`
        scalar Date
        scalar ObjectId
        scalar JSON
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
        JSON: JSONScalar,
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
}

const generateIndexGraphqlJs = () => {
    return `
    import { ApolloServer } from 'apollo-server-express';
    import express from 'express';
    import connectToDb from './config/db.js';
    import schema from './modules/index.js';
    import { WebSocketServer } from 'ws';
    import http from 'http';
    import bodyParser from 'body-parser';
    import dotenv from 'dotenv';

    dotenv.config();

    const app = express();
    const httpServer = http.createServer(app);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        next();
    });
    app.disable('x-powered-by');

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

    const PORT = process.env.PORT || 4000;
    const server = new ApolloServer({ 
        cache: 'bounded',
        schema,
        context: ({ req, res }) => ({ req, res }),
        plugins: [
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            subscriptionServer.close();
                        }
                    };
                }
            }
        ]
    });

    const wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            console.log(\`Received message \${message}\`);
        });
        ws.send('Hello! Message From Server!!');
    });

    async function startApolloServer() {
        await server.start();
        server.applyMiddleware({ app });
       
        httpServer.listen(PORT, () => {
            console.log(\`🚀 Server ready at http://localhost:\${PORT}\${server.graphqlPath}\`);
            console.log(\`🚀 Subscriptions ready at ws://localhost:\${PORT}\`);
        });
    }
    connectToDb().then(startApolloServer);
    `;
}

const generatePackageJson = (projectName: string) => {
    return `
    {
        "name": "${projectName}",
        "version": "1.0.0",
        "description": "A GraphQL API project",
        "main": "index.js",
        "scripts": {
            "start": "node ./src/index.js",
            "dev": "nodemon ./src/index.js"
        },
        "keywords": [],
        "author": "",
        "license": "ISC",
        "type": "module",
        "dependencies": {
            "apollo-server-express": "^3.4.0",
            "dotenv": "^16.0.0",
            "express": "^4.17.1",
            "graphql": "^15.3.1",
            "graphql-subscriptions": "^1.2.0",
            "@graphql-tools/schema": "^8.3.0",
            "mongoose": "^6.0.11",
            "nodemon": "^2.0.15",
            "ws": "^8.6.0",
            "http": "^0.0.1-security",
            "body-parser": "^1.19.0"
        }
    }
    `;
}

const generateScalartypes = () => {
    return `
    import { GraphQLScalarType } from 'graphql';
    import { Kind } from 'graphql/language/index.js';
    import { ObjectId } from 'mongodb';

    const DateScalar = new GraphQLScalarType({
        name: 'Date',
        description: 'Custom Date scalar type',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return value.getTime(); // value sent to the client
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10)); // ast value is always in string format
            }
            return null;
        },
    });

    const ObjectIdScalar = new GraphQLScalarType({
        name: 'ObjectId',
        description: 'MongoDB ObjectId scalar type',
        parseValue(value) {
            return new ObjectId(value); // value from the client
        },
        serialize(value) {
            return value.toString(); // value sent to the client
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.STRING) {
                return new ObjectId(ast.value); // ast value is always in string format
            }
            return null;
        },
    });

    const NumberScalar = new GraphQLScalarType({
        name: 'Number',
        description: 'Custom Number scalar type',
        parseValue(value) {
            return parseFloat(value); // value from the client
        },
        serialize(value) {
            return value; // value sent to the client
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
                return parseFloat(ast.value); // ast value is always in string format
            }
            return null;
        },
    });

    const timeScalar = new GraphQLScalarType({
        name: 'Time',
        description: 'Time custom scalar type',
        serialize(value) {
            return value;
        },
    });

    const JSONScalar = new GraphQLScalarType({
        name: 'JSON',
        description: 'JSON custom scalar type',
        parseValue(value) {
            return typeof value === 'string' ? JSON.parse(value) : value;
        },
        serialize(value) {
            return typeof value === 'object' ? value : JSON.parse(value);
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.STRING) {
                return JSON.parse(ast.value);
            }
            return null;
        },
    });

    export { DateScalar, ObjectIdScalar, NumberScalar, timeScalar, JSONScalar };
    `;
}

export default {
    generateMongoConnection,
    generateMongoModels,
    generatePubsub,
    generateCreateMutation,
    generateDeleteMutation,
    generateUpdateMutation,
    generateGetAllQuery,
    generateGetOneQuery,
    generateModuleIndex,
    generateModulesIndex,
    generateIndexGraphqlJs,
    generatePackageJson,
    generateScalartypes
};