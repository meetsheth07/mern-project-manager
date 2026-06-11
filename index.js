import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});    

let appUsername = process.env.APP_USERNAME;
let password = process.env.APP_PASSWORD;
let port = process.env.APP_PORT;
console.log(appUsername);
console.log("starting Backend server of this course");
