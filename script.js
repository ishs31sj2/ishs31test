let quizList = [];
let curQuizIdx = 0;
let corrCnt = 0;
let wrongCnt = 0;
let startTm;
let timerIntvl;
let usr = '';
let selQuizDB = '';
let selAct = '';
let quesStartTm;
const quesTimes = [];
const playerAnss = [];


function showLogin() {
    document.getElementById('usr-login').style.display = 'block';
    document.getElementById('quiz-tiles').style.display = 'none';
    document.getElementById('actions').style.display = 'none';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('edit').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('breadcrumbs').innerHTML = '<a href="#" onclick="showLogin()">홈</a>';
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('login-res').innerText = `환영합니다, ${username}`;
            usr = username;
            showQuizTiles();
        } else {
            document.getElementById('login-res').innerText = data.message || '로그인 실패';
        }
    })
    .catch(error => console.error('로그인 중 오류 발생:', error));
}

function register() {
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newUsername, newPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('register-res').innerText = data.message || '계정 생성 성공';
        } else {
            document.getElementById('register-res').innerText = data.message || '계정 생성 실패';
        }
    })
    .catch(error => console.error('계정 생성 중 오류 발생:', error));
}

function showQuizTiles() {
    document.getElementById('usr-login').style.display = 'none';
    document.getElementById('quiz-tiles').style.display = 'block';
    document.getElementById('actions').style.display = 'none';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('edit').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('breadcrumbs').innerHTML += ' / <a href="#" onclick="showQuizTiles()">퀴즈 선택</a>';
}

function selectFile(dbName) {
    selQuizDB = dbName;
    document.getElementById('quiz-tiles').style.display = 'none';
    document.getElementById('actions').style.display = 'block';
    document.getElementById('breadcrumbs').innerHTML += ` / <a href="#" onclick="showActions()">동작 선택</a>`;
}

function showActions() {
    document.getElementById('usr-login').style.display = 'none';
    document.getElementById('quiz-tiles').style.display = 'none';
    document.getElementById('actions').style.display = 'block';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('edit').style.display = 'none';
    document.getElementById('results').style.display = 'none';
}

function playQuiz() {
    selAct = 'play';
    fetchQuizDB(selQuizDB);
    document.getElementById('breadcrumbs').innerHTML += ` / <a href="#" onclick="startQuiz()">퀴즈 플레이</a>`;
}

function showEdit() {
    selAct = 'add';
    fetchQuizDB(selQuizDB);
    document.getElementById('breadcrumbs').innerHTML += ` / <a href="#" onclick="showEdit()">퀴즈 편집</a>`;
}

function fetchQuizDB(quizDB) {
    fetch(`/quiz/${quizDB}`)
        .then(response => response.text())
        .then(text => {
            const quizzes = text.split('\n');
            quizList = parseQuizzes(quizzes);
            shuffleQuizList();
            if (selAct === 'play') {
                startQuiz();
            } else if (selAct === 'add') {
                document.getElementById('edit').style.display = 'block';
                updateQuizList();
            }
            document.getElementById('actions').style.display = 'none';
        })
        .catch(error => console.error('퀴즈 파일 로드 중 오류 발생:', error));
}

function parseQuizzes(quizzes) {
    const quizList = [];
    quizzes.forEach(quiz => {
        if (quiz.includes("Q.") && quiz.includes("A.")) {
            const [quesPart, ansPart] = quiz.split("A.");
            const question = quesPart.replace("Q.", "").trim();
            let [anssPart, addInfo] = ansPart.split("M.");
            let [anss, creator] = anssPart.split("C.");
            anss = anss.split(',').map(ans => ans.trim());
            addInfo = addInfo ? addInfo.trim() : '';
            creator = creator ? creator.trim() : 'unknown';
            quizList.push({ question, anss, addInfo, creator });
        }
    });
    return quizList;
}

function shuffleQuizList() {
    for (let i = quizList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizList[i], quizList[j]] = [quizList[j], quizList[i]];
    }
}

function startQuiz() {
    curQuizIdx = 0;
    corrCnt = 0;
    wrongCnt = 0;
    quesTimes.length = 0;
    startTimer();
    displayQuiz();
    document.getElementById('quiz').style.display = 'block';
    document.getElementById('stats-cont').style.display = 'block';
}

function displayQuiz() {
    if (curQuizIdx >= quizList.length) {
        document.getElementById('question').innerText = '모든 문제를 풀었습니다!';
        for (let i = 1; i <= 7; i++) {
            document.getElementById(`ans${i}`).style.display = 'none';
        }
        document.getElementById('result').innerText = '';
        document.getElementById('next-ques').style.display = 'none';
        document.getElementById('end-quiz').style.display = 'block';
        clearInterval(timerIntvl);
        return;
    }

    const quiz = quizList[curQuizIdx];
    document.getElementById('question').innerHTML = `${quiz.question}<br><span style="color: skyblue;">${quiz.creator}</span>`;
    for (let i = 1; i <= 7; i++) {
        document.getElementById(`ans${i}`).value = '';
        document.getElementById(`ans${i}`).style.display = 'none';
    }

    const anssCnt = quiz.anss.length;
    for (let i = 1; i <= anssCnt; i++) {
        document.getElementById(`ans${i}`).style.display = 'block';
    }

    if (anssCnt > 1) {
        document.getElementById('result').innerText = `정답이 여러 개 있습니다. ${anssCnt - 1}개 더 입력하세요.`;
    } else {
        document.getElementById('result').innerText = '';
    }
    document.getElementById('ans1').dataset.correctAnss = JSON.stringify(quiz.anss);
    document.getElementById('ans1').dataset.addInfo = quiz.addInfo;
    document.getElementById('next-ques').style.display = 'none';
    document.getElementById('end-quiz').style.display = 'none';

    quesStartTm = Date.now();
}

function checkAnswer() {
    const userAnss = [];
    let i = 1;
    while (document.getElementById(`ans${i}`) && document.getElementById(`ans${i}`).style.display !== 'none') {
        userAnss.push(removeSpaces(document.getElementById(`ans${i}`).value.trim()));
        i++;
    }

    console.log('User Answers:', userAnss);

    const correctAnss = JSON.parse(document.getElementById('ans1').dataset.correctAnss).map(ans => removeSpaces(ans.trim()));

    console.log('Correct Answers:', correctAnss);

    const sortedUserAnss = userAnss.sort();
    const sortedCorrectAnss = correctAnss.sort();

    console.log('Sorted User Answers:', sortedUserAnss);
    console.log('Sorted Correct Answers:', sortedCorrectAnss);

    const incorrAnss = sortedUserAnss.filter(ans => !sortedCorrectAnss.includes(ans));
    const missAnss = sortedCorrectAnss.filter(ans => !sortedUserAnss.includes(ans));
    const resultElem = document.getElementById('result');

    playerAnss[curQuizIdx] = userAnss.join(', ');

    const quesTm = (Date.now() - quesStartTm) / 1000;
    quesTimes.push(quesTm);

    if (incorrAnss.length === 0 && missAnss.length === 0) {
        resultElem.innerHTML = `정답입니다!`;
        resultElem.style.color = 'green';
        corrCnt++;
    } else {
        resultElem.innerHTML = `틀렸습니다. 틀린 답: ${incorrAnss.join(', ')}<br>누락된 정답: ${missAnss.join(', ')}`;
        resultElem.style.color = 'red';
        wrongCnt++;
        addWrongAnswer(quizList[curQuizIdx].question, correctAnss, userAnss);
    }

    console.log('Result Element:', resultElem);

    updateStats();
    document.getElementById('next-ques').style.display = 'block';
    document.getElementById('end-quiz').style.display = 'block';
}

function nextQuestion() {
    curQuizIdx++;
    displayQuiz();
}

function addWrongAnswer(question, correctAnss, addInfo) {
    const wrongAnssList = document.getElementById('wrong-anss');
    const listItem = document.createElement('li');
    listItem.innerHTML = `${question} - 정답: ${correctAnss.join(', ')}${addInfo ? ` <span style="color: blue;">(${addInfo})</span>` : ''}`;
    wrongAnssList.appendChild(listItem);
}

function updateStats() {
    const total = corrCnt + wrongCnt;
    const accuracy = total > 0 ? Math.round((corrCnt / total) * 100) : 0;
    document.getElementById('accuracy').innerText = accuracy;
}

function endQuiz() {
    clearInterval(timerIntvl);
    const totalTm = (Date.now() - startTm) / 1000;
    const accuracy = (corrCnt / (corrCnt + wrongCnt)) * 100;
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    const questionLabels = [];
    const answerPercentages = [];

    quizList.forEach((quiz, index) => {
        const userAns = removeSpaces(playerAnss[index]);
        const correctAnss = quiz.anss.map(removeSpaces).sort();
        const isCorrect = JSON.stringify(correctAnss) === JSON.stringify(userAns.split(',').sort());
        const resultItem = document.createElement('li');
        resultItem.style.color = isCorrect ? 'green' : 'red';
        resultItem.innerHTML = `질문: ${quiz.question}, ${isCorrect ? '정답' : '오답'}, 시간: ${quesTimes[index].toFixed(2)}초, 플레이어 답: ${playerAnss[index]}, 정답: ${correctAnss.join(', ')}`;
        resultsList.appendChild(resultItem);

        questionLabels.push(`Q${index + 1}`);
        answerPercentages.push(isCorrect ? 75 : 25);
    });

    document.getElementById('total-tm').innerText = `총 시간: ${totalTm.toFixed(2)}초`;
    document.getElementById('total-acc').innerText = `정확도: ${accuracy.toFixed(2)}%`;

    const timePerQues = totalTm / quizList.length;
    const streak = corrCnt;

    updateLeaderboards(usr, streak, timePerQues);

    document.getElementById('quiz').style.display = 'none';
    document.getElementById('results').style.display = 'block';

    const ctx = document.getElementById('results-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: questionLabels,
            datasets: [{
                label: 'Quiz Results Analysis',
                data: answerPercentages,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}


function updateLeaderboards(username, streak, timePerQues) {
    fetch('/leaderboard/streak', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, score: streak })
    }).then(() => {
        fetch('/leaderboard/time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, time: timePerQues })
        }).then(() => {
            displayLeaderboards();
        });
    });
}

function displayLeaderboards() {
    fetch('/leaderboard/streak')
        .then(response => response.json())
        .then(data => {
            const leaderboard = document.getElementById('streak-leaderboard');
            leaderboard.innerHTML = '';
            data.forEach((entry, index) => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span style="font-weight: bold; color: ${getPastelColor(index)};">${index + 1}위: ${entry.user}</span>: ${entry.score}`;
                leaderboard.appendChild(listItem);
            });
        });

    fetch('/leaderboard/time')
        .then(response => response.json())
        .then(data => {
            const leaderboard = document.getElementById('time-leaderboard');
            leaderboard.innerHTML = '';
            data.forEach((entry, index) => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span style="font-weight: bold; color: ${getPastelColor(index)};">${index + 1}위: ${entry.user}</span>: ${entry.time.toFixed(2)}초`;
                leaderboard.appendChild(listItem);
            });
        });
}

function getPastelColor(index) {
    const pastelColors = [
        '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fffffc'
    ];
    return pastelColors[index % pastelColors.length];
}

function startTimer() {
    startTm = Date.now();
    timerIntvl = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTm = Date.now() - startTm;
    const minutes = Math.floor(elapsedTm / 60000);
    const seconds = Math.floor((elapsedTm % 60000) / 1000);
    document.getElementById('timer').innerText = `${pad(minutes)}:${pad(seconds)}`;
}

function pad(number) {
    return number.toString().padStart(2, '0');
}

function removeSpaces(str) {
    return str.replace(/\s+/g, '');
}

function addQuiz() {
    const newQues = document.getElementById('new-ques').value.trim();
    const newAnss = document.getElementById('new-ans').value.trim().split(',').map(ans => ans.trim());
    const newInfo = document.getElementById('new-info').value.trim();
    
    const newQuiz = `Q. ${newQues} A. ${newAnss.join(',')}${newInfo ? ' M. ' + newInfo : ''} C. ${usr}\n`;
    
    fetch(`/quiz/add/${selQuizDB}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: newQuiz
    })
    .then(response => response.text())
    .then(data => {
        console.log('새 퀴즈가 성공적으로 추가되었습니다');
        fetchQuizDB(selQuizDB);
    })
    .catch(error => console.error('새 퀴즈 추가 중 오류 발생:', error));
}

function updateQuizList() {
    const quizListElem = document.getElementById('quiz-list');
    quizListElem.innerHTML = '';
    quizList.forEach((quiz, index) => {
        const listItem = document.createElement('li');
        listItem.innerText = `${index + 1}. ${quiz.question}`;
        if (usr === 'admin' || usr === quiz.creator) {
            const removeBtn = document.createElement('button');
            removeBtn.innerText = '제거';
            removeBtn.className = 'remove-btn';
            removeBtn.onclick = () => removeQuiz(index);
            listItem.appendChild(removeBtn);
        }
        quizListElem.appendChild(listItem);
    });
}

function removeQuiz(index) {
    const quiz = quizList[index];
    fetch(`/quiz/remove/${selQuizDB}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: quiz.question })
    })
    .then(response => response.text())
    .then(data => {
        console.log('퀴즈가 성공적으로 제거되었습니다', data);
        fetchQuizDB(selQuizDB);
    })
    .catch(error => console.error('퀴즈 제거 중 오류 발생:', error));
}

function removeSpaces(str) {
    return str.replace(/\s+/g, '').toLowerCase();
}

