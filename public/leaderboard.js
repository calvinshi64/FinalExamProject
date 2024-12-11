async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();

        const leaderboardBody = document.getElementById('leaderboard-body');
        leaderboardBody.innerHTML = '';

        let rows = '';

        data.forEach((user, index) => {
            rows += '<tr>' +
                '<td>' + (index + 1) + '</td>' +
                '<td>' + user.username + '</td>' +
                '<td>' + user.highScore + '</td>' +
            '</tr>';
        });

        leaderboardBody.innerHTML = rows;
    } catch (error) {
        console.error('Error fetching leaderboard data:', error);
    }
}

fetchLeaderboard();