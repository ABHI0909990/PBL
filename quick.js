
let quiz = {
    title: "",
    questions: []
};

document.getElementById('addQuestionBtn').addEventListener('click', function () {
    const questionContainer = document.createElement('div');
    questionContainer.classList.add('questionBlock');
    
    const questionLabel = document.createElement('label');
    questionLabel.innerText = "Question:";
    
    const questionInput = document.createElement('input');
    questionInput.type = 'text';
    questionInput.classList.add('questionInput');
    
    const optionLabel = document.createElement('label');
    optionLabel.innerText = "Answer Options (comma-separated):";
    
    const optionInput = document.createElement('input');
    optionInput.type = 'text';
    optionInput.classList.add('optionInput');
    
    const correctLabel = document.createElement('label');
    correctLabel.innerText = "Correct Answer (type exactly as in options):";
    
    const correctInput = document.createElement('input');
    correctInput.type = 'text';
    correctInput.classList.add('correctInput');
    
    questionContainer.appendChild(questionLabel);
    questionContainer.appendChild(questionInput);
    questionContainer.appendChild(optionLabel);
    questionContainer.appendChild(optionInput);
    questionContainer.appendChild(correctLabel);
    questionContainer.appendChild(correctInput);
    
    document.getElementById('questionsContainer').appendChild(questionContainer);
});

document.getElementById('createQuizForm').addEventListener('submit', function (event) {
    event.preventDefault();
    
    const title = document.getElementById('quizTitle').value;
    const questions = document.getElementsByClassName('questionInput');
    const options = document.getElementsByClassName('optionInput');
    const correctAnswers = document.getElementsByClassName('correctInput');
    
    quiz.title = title;
    quiz.questions = [];
    
    for (let i = 0; i < questions.length; i++) {
        quiz.questions.push({
            question: questions[i].value,
            options: options[i].value.split(','),
            correct: correctAnswers[i].value.trim()
        });
    }
    
    alert('Quiz created successfully!');
    displayQuiz();
});

function displayQuiz() {
    const takeQuizContainer = document.getElementById('takeQuizContainer');
    takeQuizContainer.innerHTML = `<h2>${quiz.title}</h2>`;
    
    quiz.questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('takeQuizQuestion');
        
        const questionTitle = document.createElement('p');
        questionTitle.innerText = `Q${index + 1}: ${q.question}`;
        
        const optionsDiv = document.createElement('div');
        
        q.options.forEach(option => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question${index}`;
            radio.value = option.trim();
            
            label.appendChild(radio);
            label.appendChild(document.createTextNode(option.trim()));
            optionsDiv.appendChild(label);
        });
        
        questionDiv.appendChild(questionTitle);
        questionDiv.appendChild(optionsDiv);
        takeQuizContainer.appendChild(questionDiv);
    });
    
    document.getElementById('submitQuizBtn').style.display = 'inline';
}

document.getElementById('submitQuizBtn').addEventListener('click', function () {
    let score = 0;
    
    quiz.questions.forEach((q, index) => {
        const selectedOption = document.querySelector(`input[name="question${index}"]:checked`);
        if (selectedOption && selectedOption.value === q.correct) {
            score++;
        }
    });
    
    const totalQuestions = quiz.questions.length;
    const resultMessage = `You scored ${score} out of ${totalQuestions}`;
    
    document.getElementById('quizResult').innerText = resultMessage;
});
