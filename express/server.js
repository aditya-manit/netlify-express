'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');


var express_graphql = require('express-graphql');
var {buildSchema} = require('graphql');
var axios = require('axios');
const API_URL = "https://api.aleo.network"
const AUTH_TOKEN = "YjEzNDY0NDctYTBhOS00OGMyLWE2YzMtOTA4ZjA4ZmYyNDk5"

//get best --> het heifght range --> blocks
//for all the blocks transactions --> get transaction by batch
// GraphQL Schema
var schema = buildSchema(`
    type Query {
        course(id: Int!): Course
        courses(topic: String): [Course]
        transaction(hash: String): Transaction
        block(height: Int!): Block
        searchGetType(query: String): SearchGetType
    }
    type Mutation {
        updateCourseTopic(id: Int!, topic: String!): Course
    }
    
    type SearchGetType {
        type: String
    }
    
    type Course {
        id: Int
        title: String
        author: String
        description: String
        topic: String
        url: String
    }
    
    type ParentBlock { 
      hash: String
      height: Int
      time: Int
      canonical: Boolean
    }

    type Transaction { 
      hash: String
      memo: String
      size: Int
      valueBalance: Int
      digest: String
      transactionProof: String
      localDataRoot: String
      programCommitment: String
      parentBlock: ParentBlock
      signatures: [String]
      oldSerialNumbers: [String]
      newCommitments: [String]
    }
    
    type Block { hash: String
  height: Int
  merkleRoot: String
  pedersenMerkleRootHash: String
  time: Int
  nonce: Int
  previousBlockHash: String
  size: Int
  difficultyTarget: Int
  canonical: Boolean
  proof: String
  transactions: [String ] }
`);

var coursesData = [
    {
        id: 1,
        title: 'The Complete Node.js Developer Course',
        author: 'Andrew Mead, Rob Percival',
        description: 'Learn Node.js by building real-world applications with Node, Express, MongoDB, Mocha, and more!',
        topic: 'Node.js',
        url: 'https://codingthesmartway.com/courses/nodejs/'
    },
    {
        id: 2,
        title: 'Node.js, Express & MongoDB Dev to Deployment',
        author: 'Brad Traversy',
        description: 'Learn by example building & deploying real-world Node.js applications from absolute scratch',
        topic: 'Node.js',
        url: 'https://codingthesmartway.com/courses/nodejs-express-mongodb/'
    },
    {
        id: 3,
        title: 'JavaScript: Understanding The Weird Parts',
        author: 'Anthony Alicea',
        description: 'An advanced JavaScript course for everyone! Scope, closures, prototypes, this, build your own framework, and more.',
        topic: 'JavaScript',
        url: 'https://codingthesmartway.com/courses/understand-javascript/'
    }
]

var getCourse = function (args) {
    console.log("here")
    var id = args.id;
    return coursesData.filter(course => {
        return course.id == id;
    })[0];
}

var getCourses = function (args) {
    if (args.topic) {
        var topic = args.topic;
        return coursesData.filter(course => course.topic === topic);
    } else {
        return coursesData;
    }
}

var updateCourseTopic = function ({id, topic}) {
    coursesData.map(course => {
        if (course.id === id) {
            course.topic = topic;
            return course;
        }
    });
    return coursesData.filter(course => course.id === id)[0];
}

var getTransaction = async function (args) {
    var ans = null;
    var hash = args.hash;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${AUTH_TOKEN}`
    }
    var payload = {"hash": `${hash}`}

    await axios.post(`${API_URL}/transaction/getbyhash`, payload, {
        headers: headers
    })
        .then(res => {
            console.log("transaction api response:", res.data.result)
            ans = res.data.result
        })
        .catch(err => {
            console.log(err)
            return null
        })

    return ans
}

var getBlock = async function (args) {

    var ans = null;
    var height = args.height;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${AUTH_TOKEN}`
    }
    var payload = {"height": height}

    await axios.post(`${API_URL}/block/getbyheight`, payload, {
        headers: headers
    })
        .then(res => {
            console.log("block api response:", res.data.result)
            ans = res.data.result
        })
        .catch(err => {
            console.log(err)
            return null
        })

    return ans
}

//todo: add search by block hash
var getSearchType = async function (args) {
    var query = args.query;


    height = parseInt(query);
    hash = query;

    var combinedArgs = {
        height: height,
        hash: hash
    }

    console.log("combinedArgs", combinedArgs)

    if (Number.isInteger(query)) {
        block = await getBlock(combinedArgs);
        console.log("block: ", block)
        if (block !== null) {
            return {type: "Block"}
        }
    }
    transaction = await getTransaction(combinedArgs);
    console.log("transaction: ", transaction)
    if (transaction !== null) {
        return {type: "Transaction"}
    }
    return {type: "Error"}
}

// Root resolver
var root = {
    course: getCourse,
    courses: getCourses,
    // this should be same has whats defined in query
    transaction: getTransaction,
    block: getBlock,
    searchGetType: getSearchType,
    updateCourseTopic: updateCourseTopic
};

// Create an expres server and a GraphQL endpoint
// var app = express();


const router = express.Router();
router.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello from Express.js!</h1>');
  res.end();
});
router.get('/another', (req, res) => res.json({ route: req.originalUrl }));
router.post('/', (req, res) => res.json({ postBody: req.body }));

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

app.use('/graphql', express_graphql({
    schema: schema,
    rootValue: root,
    graphiql: true
}));

module.exports = app;
module.exports.handler = serverless(app);
