const express=require("express")
const cors=require("cors")

const app=express()
app.use(cors())
app.use(express.json())

app.post("/api/task",(req,res)=>{
  const {name,task}=req.body

  console.log("Task Received:",name,task)

  // Here you would send data to Google Sheets API

  res.json({message:"Task submitted successfully"})
})

app.listen(5000,()=>console.log("Server running on port 5000"))