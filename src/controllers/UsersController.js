/*
* index - GET para listar vários registros.
* show - GET para exibir um registro escifico.
* create - POST para criar um  registro.
* update - PUT para atualizar um registro.
* delete - DELETE para remover um registro.
*/
const {hash, compare} = require("bcryptjs");
const AppError = require("../utils/AppError");

const sqliteConnection = require('../database/sqlite')

class UsersController {
    async create(request, response) {
        const {name, email, password} = request.body;

        const database = await sqliteConnection();
        const checkUserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email])

        if(checkUserExists){
            throw new AppError("Este e-mail está em uso.");
        }

        const hashedPassword = await hash(password, 8);

        await database.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]
            );

        return response.status(201).json();


    }

    async update (request, response) {
        const { name, email, password, old_password} = request.body;
        const user_id = request.user.id;

        const database = await sqliteConnection();
        const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id]);

        if(!user) {
            throw new AppError("Usuário não encontrado");
        }

        const userWithUpdateEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email]);

        if(userWithUpdateEmail && userWithUpdateEmail.id !== user.id){
            throw new AppError("Esse email já está em uso.");
        }

        user.name = name ?? user.name;
        user.email = email ?? user.email;

        if(password && !old_password){
            throw new AppError("você precisa informar a antiga senha para definir a nova.")
        }

        if(password && old_password){
            const checkOldPassword = await compare(old_password, user.password);
            if(!checkOldPassword){
                throw new AppError("Senha antiga não confere")
            }

            user.password = await hash(password, 8)
        }

        await database.run(`UPDATE users SET name = ?, email = ?, password = ?, update_at = DATETIME('now') WHERE id = ?`,
        [user.name, user.email, user.password, user_id]
        );

        return response.status(200).json();

    }
}

module.exports = UsersController;