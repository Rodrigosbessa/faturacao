const grid = document.getElementById('grid');
const squareSize = 50; // Tamanho de cada quadrado

function createGrid() {
    grid.innerHTML = ''; // Limpa se redimensionar
    const columns = Math.ceil(window.innerWidth / squareSize);
    const rows = Math.ceil(window.innerHeight / squareSize);
    const totalSquares = columns * rows;

    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-item');

        // Quando o mouse passa, acende
        square.addEventListener('mouseenter', () => {
            square.classList.add('active');
            // Remove a classe depois de um tempo para ele apagar
            setTimeout(() => {
                square.classList.remove('active');
            }, 500);
        });

        grid.appendChild(square);
    }
}

createGrid();
window.addEventListener('resize', createGrid); // Refaz se mudar tamanho da tela