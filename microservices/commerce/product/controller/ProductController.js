const product = require("../models/Product");

exports.addProduct = async (req, res) => {
    const { name, price, userId } = req.body;

    if (!userId){
        return res.status(400).json({message: "The userId needs to be filled"});
    }

    try{
        const productt = await product.create({
            name,
            price,
            userId
        });

        res.status(201).json(productt);
    } catch (err) {
        res.status(500).json({error: err.message})
    }
}