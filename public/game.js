let currentScore = 0;
let highScore = Number(document.getElementById("high-score").innerHTML);

async function fetchAnimeData() {
    try {
        const response = await fetch('/get-anime');
        const data = await response.json();

        displayAnime(data.anime1, data.anime2);
    } catch (error) {
        console.error('Error fetching anime data:', error);
        alert('Failed to load anime data. Please try again.');
    }
}

function displayAnime(anime1, anime2) {
    document.getElementById('anime1-image').src = anime1.image;
    document.getElementById('anime1-title').innerHTML = `"${anime1.title}"`;
    document.getElementById('anime1-rank').innerHTML = `Number ${anime1.score}`;

    document.getElementById('anime2-image').src = anime2.image;
    document.getElementById('anime2-title').innerHTML = `"${anime2.title}"`;

    document.getElementById('higher-button').dataset.score = anime2.score;
    document.getElementById('lower-button').dataset.score = anime2.score;
    document.getElementById('higher-button').dataset.comparison = anime1.score;
    document.getElementById('lower-button').dataset.comparison = anime1.score;
}

async function handleGuess(isHigher) {
    const score = parseFloat(document.getElementById('higher-button').dataset.score);
    const comparison = parseFloat(document.getElementById('higher-button').dataset.comparison);
    const correct = isHigher ? score > comparison : score < comparison;

    if (correct) {
        currentScore++;
        highScore = Math.max(highScore, currentScore);
        updateScores();
        fetchAnimeData();
    } else {
        alert('Incorrect! Game Over.');
        await submitScore(currentScore);
        currentScore = 0;
        updateScores();
    }
}

function updateScores() {
    document.getElementById('current-score').innerHTML = currentScore;
    document.getElementById('high-score').innerHTML = highScore;
}

async function submitScore(score) {
    try {
        const response = await fetch('/update-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score }),
        });
        const data = await response.json();
        console.log(data.message);
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}


document.getElementById('higher-button').addEventListener('click', async () => handleGuess(true));
document.getElementById('lower-button').addEventListener('click', async () => handleGuess(false));

fetchAnimeData();
