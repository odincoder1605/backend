import 'dotenv/config';

import connectDB from './db/connectDB.js'

connectDB();


// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR:",error);
//             throw error
//         })
//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })
//     } catch(error){
//         console.log("ERROR" ,error)
//     }
// })()