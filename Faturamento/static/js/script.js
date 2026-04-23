const grid = document.getElementById('grid');
const squareSize = 50; 

function createGrid() {
    grid.innerHTML = ''; 
    const columns = Math.ceil(window.innerWidth / squareSize);
    const rows = Math.ceil(window.innerHeight / squareSize);
    const totalSquares = columns * rows;

    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('grid-item');

        
        square.addEventListener('mouseenter', () => {
            square.classList.add('active');
            
            setTimeout(() => {
                square.classList.remove('active');
            }, 500);
        });

        grid.appendChild(square);
    }
}

createGrid();
window.addEventListener('resize', createGrid); 