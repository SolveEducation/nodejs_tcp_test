module.exports = {
    name: "DB_Login",
    columns: {
        Record_KEY: {
            primary: true,
            type: "int",
            generated: true
        },
        User_Name: {
            type: "varchar"
        }
    }
};