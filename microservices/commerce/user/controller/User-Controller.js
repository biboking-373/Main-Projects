const db = require("../config/Sql-database");

exports.createUser = async (req,res) => {
    const { name, phonenumber, age, identity } = req.body;

    if (!name || !phonenumber || !age || !identity){
        return res.status(400).json({message: "Field must be entered"});
    }

    const regexphonenumber = /^(07|01)\d{8}$/
    if (!regexphonenumber.test(phonenumber)){
        return res.status(400).json({message: "Phone number must be 10 digits or start with 07 or 01"})
    }
    
    let formattedPhone = phonenumber;
    formattedPhone = "+254" + phonenumber.substring(1);

    if (age < 18 || age > 125){
        return res.status(400).json({message: "Your either too young of age or non-existent"});
    }

    if (identity.length > 8){
        return res.status(400).json({message: "Your guessing your ID, you naughty naughty"});
    }
    try {
        const [existing] = await db.execute(
            'SELECT * FROM user_service1 WHERE Phonenumber = ?',
            [formattedPhone]
        )

        if (existing.length > 0){
            return res.status(400).json({message:"User already exists"})
        };

        const [new_user] = await db.execute(
            `INSERT INTO user_service1  (Name, Phonenumber, Age, IdentityCardnumber)
            VALUES (?, ?, ?, ?)`,
            [name, formattedPhone, age, identity]
        );

        res.status(201).json({
            message: "User Created Successfully",
            userId: new_user.insertId,
        })

    } catch(error){
        console.error("Registration error: ", error);
        res.status(500).json({error: "Something is wrong with the registration"});
    }
}

exports.getUser = async(req, res) => {
    const { phonenumber } = req.query;

    if (!phonenumber) {
        return res.status(400).json({message: "Phone-number needed"});
    }

    let formattedPhone = phonenumber;
    if (formattedPhone.startsWith("0")){
        formattedPhone = "+254" + formattedPhone.substring(1);
    }

    try {
        const [rows] = await db.execute(
            `SELECT * FROM user_service1 WHERE Phonenumber = ?`,
            [formattedPhone]
        );

        if (rows.length === 0){
            return res.status(400).json({message: "User not found"});
        }

        const user = rows[0];

        res.json({
            id: user.id,
            name: user.Name,
            phonenumber: user.Phonenumber,
            age: user.Age,
            IdCard: user.IdentiyCardnumber
        });

    } catch (err) {
        console.error(" Error fetching user ", err);
        res.status(500).json({message: " Something went wrong "});
    }
}
