const fs = require("fs");
const path = require("path");
const booksJsonPath = path.join("database", "books.json");
const booksDataJsPath = path.join("frontend", "js", "data", "booksData.js");
const existingBooks = JSON.parse(fs.readFileSync(booksJsonPath, "utf8"));
const generateBooks = (difficulty, startRange, endRange, existing) => {
    const books = existing.filter(b => b.difficulty === difficulty).slice(0, 10);
    for (let i = books.length + 1; i <= 100; i++) {
        const id = difficulty + "-" + i;
        const year = startRange + ((i * 13) % (endRange - startRange + 1));
        books.push({
            id,
            title: "Book " + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + " " + i,
            author: "Author " + i,
            year,
            difficulty,
            cover: "https://covers.openlibrary.org/b/id/8231856-L.jpg"
        });
    }
    return books;
};
const easyBooks = generateBooks("easy", 1810, 2020, existingBooks);
const mediumBooks = generateBooks("medium", 1850, 2022, existingBooks);
const hardBooks = generateBooks("hard", 1900, 2024, existingBooks);
const allBooks = easyBooks.concat(mediumBooks, hardBooks);
fs.writeFileSync(booksJsonPath, JSON.stringify(allBooks, null, 2), "utf8");
fs.writeFileSync(booksDataJsPath, "export const booksData = " + JSON.stringify(allBooks, null, 2) + ";", "utf8");
console.log("Files updated successfully.");
