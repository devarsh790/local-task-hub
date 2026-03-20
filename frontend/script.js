document.getElementById("taskForm").addEventListener("submit", async (e)=>{
  e.preventDefault()

  const name=document.getElementById("name").value
  const task=document.getElementById("task").value

  const res = await fetch("http://localhost:5000/api/task",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,task})
  })

  const data=await res.json()
  document.getElementById("msg").innerText=data.message
})