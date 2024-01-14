//imports
const express = require('express');
const cors = require("cors");
const mongoose = require("mongoose")
const dotenv = require("dotenv");
const connectDb  = require('./config/db');
//const userRoute = require("./routes/userRoute.js")
const logger = require("./config/logEvents.js");
//const { notFound, errorHandler } = require('./middlewares/errorHander.js');
const asyncHandler = require("express-async-handler");
const User = require("./models/userModel.js") 
const Message = require("./models/messageModel.js") 
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const ws = require('ws');
dotenv.config();



//valriable assigns
const app = express();
const PORT = process.env.PORT


//function or other calls
connectDb();


app.use(express.json());
app.use(express.urlencoded({
    extended:true
}));
app.use(cookieParser())

app.use(cors({
    origin: "https://chat-app-4d33.onrender.com",
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(logger)



app.get("/api/users/profile", asyncHandler(async(req,res) => {
    const {token} = req.cookies;

    if(token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, userdata) =>{
        if(err) throw err
        //const {username, id} = userdata
        res.json(userdata)
        

    })}else{
        res.status(401).json("no token")
    }

}))

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
      const token = req.cookies?.token;
      if (token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
          if (err) throw err;
          resolve(userData);
        });
      } else {
        reject('no token');
      }
    });
  
  }

app.post("/api/users/register", asyncHandler(async(req,res) => {
    const {username, password} = req.body;
    const userExists = await User.findOne({username})
    if(!userExists){
        const createdUser = await User.create({
            username,
            password
        })
        jwt.sign({userId: createdUser._id, username: createdUser.username}, process.env.JWT_SECRET, (err, token) =>{
            if (err) throw err;
            res.cookie("token", token, {sameSite: "none", secure: true}).status(201).json({message: "ok", id: createdUser._id, username: createdUser.username})
        });
        
    }else{
        res.json({message:"user already exists"})
    }

}));

app.get('/api/users/people', async (req,res) => {
    const users = await User.find({}, {'_id':1,username:1});
    res.json(users);
  });
app.post("/api/users/login", asyncHandler(async(req,res) => {
    const {username, password} = req.body;
    const userExists = await User.findOne({username})
    if(userExists && (await userExists.matchPassword(password))){
        jwt.sign({userId: userExists._id, username: userExists.username}, process.env.JWT_SECRET,(err, token) =>{
            if (err) throw err;
            res.cookie("token", token).status(201).json({message: "ok", id: userExists._id, username: userExists.username})
        });
    
        
    }else{
        res.json({message:"failed"})
    }

}));

app.get('/api/users/messages/:userId', async (req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender:{$in:[userId,ourUserId]},
      recipient:{$in:[userId,ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
  });
  

  app.post('/api/users/logout', (req,res) => {
    res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
  });



//app.use("/api/users", userRoute)



//app.use(notFound)
//app.use(errorHandler)
const server = app.listen(PORT, ()=> {
    console.log(`Server is running on port: ${PORT}`)
})

const wss = new ws.WebSocketServer({server});

wss.on("connection", (connection, req) => {
    
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
      }));
    });
  }


        connection.isAlive = true;

        connection.timer = setInterval(() => {
            connection.ping();
            connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            notifyAboutOnlinePeople();
            console.log('dead');
            }, 1000);
        }, 5000);


        
  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });


    const cookies = req.headers.cookie;
    if(cookies) {
        const tokenStringCookie = cookies.split("; ").find(str => str.startsWith("token="));
        
        if(tokenStringCookie) {
            const token = tokenStringCookie.split("=")[1]
            jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
                if(err) throw err
                const  {userId, username} = userData;
                connection.userId = userId;
                connection.username = username;
            });
        }
    }

    //Sending online users


    connection.on('message', async (message, isBinary) => {
        const messageData = JSON.parse(message.toString())
        const {text, recipient} = messageData

        console.log(messageData);

        
        if(recipient && text) {
        const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text
            });

        [...wss.clients]
           .filter(c => c.userId === recipient)
           .forEach(c => c.send(JSON.stringify(
            {
                 text,
                 sender: connection.userId,
                 recipient,
                 _id: messageDoc._id
            })));

        }
        


    })

    notifyAboutOnlinePeople();

})




