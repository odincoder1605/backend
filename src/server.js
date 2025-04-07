import 'dotenv/config';
import app from './app.js';

import connectDB from './db/connectDB.js'

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Error:",error);
    })
})
.then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`Server running successfully at: http://localhost:${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("Error:",error);
});


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