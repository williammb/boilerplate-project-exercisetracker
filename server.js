const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
require('dotenv').config();
mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true })

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware 
/*
app.use((req, res, next) => {
    return next({ status: 404, message: 'not found' })
})*/

// Error Handling middleware
app.use((err, req, res, next) => {
    let errCode, errMessage

    if (err.errors) {
        // mongoose validation error
        errCode = 400 // bad request
        const keys = Object.keys(err.errors)
            // report the first validation error
        errMessage = err.errors[keys[0]].message
    } else {
        // generic or custom error
        errCode = err.status || 500
        errMessage = err.message || 'Internal Server Error'
    }
    res.status(errCode).type('txt')
        .send(errMessage)
})

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: Date
});

const UserObj = mongoose.model('User', userSchema);
const ExerciseObj = mongoose.model('Exercise', exerciseSchema);

app.post('/api/exercise/new-user', async(req, res) => {
    const username = req.body.username;
    const obj = await UserObj.findOne({ username: username });
    if (obj) {
        res.json({ "userId": obj['_id'], "username": obj['username'] });
    } else {
        const createdUser = await UserObj.create({ "username": username });
        res.json({ "userId": createdUser['_id'], "username": createdUser['username'] });
    }
});

app.post('/api/exercise/add', async(req, res) => {
    const description = req.body.description;
    const duration = req.body.duration;
    const date = req.body.date || '';
    if (req.body.userId.match(/^[0-9a-fA-F]{24}$/)) {
        const user = await UserObj.findOne({ _id: req.body.userId });
        if (user) {
            const createExercise = await ExerciseObj.create({ userId: user['_id'], description, duration, date: new Date(date) });
            res.json({ userId: createExercise['userId'], description: createExercise['description'], duration: createExercise['duration'], date: createExercise['date'] })
        } else {
            res.json('userId Invalid');
        }
    } else {
        res.json('userId Invalid');
    }
});

app.get('/api/exercise/log', async(req, res) => {
    const userId = req.query.userId || null;
    const from = req.query.from || null;
    const to = req.query.to || null;
    const limit = req.query.limit || null;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
        const user = await UserObj.findOne({ _id: userId });
        if (user) {
            let exercises = await ExerciseObj.find({ userId: userId });
            if (from !== null) {
                exercises = exercises.filter(obj => {
                    return obj['date'] >= new Date(from);
                })
            }
            if (to !== null) {
                exercises = exercises.filter(obj => {
                    return obj['date'] <= new Date(to);
                })
            }
            if (limit !== null) {
                exercises = exercises.slice(0, limit);
            }
            res.json({ user, exercises });
        } else {
            res.json('userId Invalid');
        }
    } else {
        res.json('userId Invalid');
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})