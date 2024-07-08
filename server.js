const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;

const accountsDB = path.join(__dirname, 'accounts.json');
const streaksDB = path.join(__dirname, 'streaks.json');
const timesDB = path.join(__dirname, 'times.json');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(express.text());
app.use(express.json());

function readDB(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`Creating file: ${filePath}`);
        fs.writeFileSync(filePath, JSON.stringify({}));
    }
    const data = fs.readFileSync(filePath, 'utf8');
    console.log(`Read from ${filePath}: ${data}`);
    return JSON.parse(data);
}

function writeDB(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Wrote to ${filePath}: ${JSON.stringify(data, null, 2)}`);
}

app.post('/register', (req, res) => {
    const { newUsername, newPassword } = req.body;
    console.log(`Registering user: ${newUsername}`);
    const accounts = readDB(accountsDB);

    if (accounts[newUsername]) {
        console.log('Username already exists');
        return res.json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    accounts[newUsername] = { password: hashedPassword };
    writeDB(accountsDB, accounts);
    console.log('Account created');
    res.json({ success: true, message: 'Account created' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Logging in user: ${username}`);
    const accounts = readDB(accountsDB);

    if (!accounts[username]) {
        console.log('Invalid username');
        return res.json({ success: false, message: 'Invalid username or password' });
    }

    const isValidPassword = bcrypt.compareSync(password, accounts[username].password);

    if (isValidPassword) {
        console.log('Login successful');
        res.json({ success: true });
    } else {
        console.log('Invalid password');
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

app.get('/quiz/:dbName', (req, res) => {
    const dbName = req.params.dbName;
    const filePath = path.join(__dirname, 'quizzes', dbName);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading quiz file', err);
            res.status(500).send('Error reading quiz file');
        } else {
            res.send(data);
        }
    });
});

app.post('/quiz/:dbName', (req, res) => {
    const dbName = req.params.dbName;
    const filePath = path.join(__dirname, 'quizzes', dbName);
    fs.writeFile(filePath, req.body, 'utf8', (err) => {
        if (err) {
            console.error('Error saving quiz file', err);
            res.status(500).send('Error saving quiz file');
        } else {
            res.send('Quiz saved successfully');
        }
    });
});

app.post('/quiz/add/:dbName', (req, res) => {
    const dbName = req.params.dbName;
    const filePath = path.join(__dirname, 'quizzes', dbName);
    fs.appendFile(filePath, req.body, 'utf8', (err) => {
        if (err) {
            console.error('Error adding new quiz', err);
            res.status(500).send('Error adding new quiz');
        } else {
            res.send('New quiz added successfully');
        }
    });
});

app.post('/leaderboard/streak', (req, res) => {
    const { username, score } = req.body;
    const streaks = readDB(streaksDB);

    streaks[username] = Math.max(streaks[username] || 0, score);
    writeDB(streaksDB, streaks);
    res.json({ success: true });
});

app.post('/leaderboard/time', (req, res) => {
    const { username, time } = req.body;
    const times = readDB(timesDB);

    times[username] = Math.min(times[username] || Infinity, time);
    writeDB(timesDB, times);
    res.json({ success: true });
});

app.get('/leaderboard/streak', (req, res) => {
    const streaks = readDB(streaksDB);
    const leaderboard = Object.keys(streaks)
        .map(user => ({ user, score: streaks[user] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    res.json(leaderboard);
});

app.get('/leaderboard/time', (req, res) => {
    const times = readDB(timesDB);
    const leaderboard = Object.keys(times)
        .map(user => ({ user, time: times[user] }))
        .sort((a, b) => a.time - b.time)
        .slice(0, 20);
    res.json(leaderboard);
});

app.post('/quiz/remove/:quizDB', (req, res) => {
    const quizDB = path.join(__dirname, 'quizzes', req.params.quizDB);
    const { question } = req.body;

    fs.readFile(quizDB, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('퀴즈 파일을 읽는 중 오류 발생');
        }

        const updatedQuizzes = data.split('\n').filter(line => !line.includes(question)).join('\n');

        fs.writeFile(quizDB, updatedQuizzes, 'utf8', err => {
            if (err) {
                return res.status(500).send('퀴즈 파일을 업데이트하는 중 오류 발생');
            }
            res.send('퀴즈가 성공적으로 제거되었습니다');
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
