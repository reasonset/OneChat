OneChat = {
  "chatterName": "",
  "senderURL": "http://localhost:20000/send",
  "readerURL": "http://localhost:20000/read",
  "goodbyeURL": "http://localhost:20000/bye",
}

function ChatMsg(msg) {
  this.message = msg
  this.toString = function() { return this.message }

  // HTML escaping
  this.escapeHTML = function() {
    this.message = this.message.replace(/[&<>"]/g, function(c) { return {
      "&" : "&amp;",
      '"' : "&quot;",
      "<" : "&lt;",
      ">" : "&gt;"
    }[c] } )
    return this
  }
}

(function() {
  if (!(JSON && JSON.parse && JSON.stringify && document.addEventListener && XMLHttpRequest && "TEST".includes && document.getElementById("ChatWindow").insertAdjacentHTML && [].forEach)) {
    alert("Sorry, your browser isn't impremented required features.")
    return void(0)
  }

  var mainFunction = function() {
    /* Feature test */
    var nextInverval = 5000
  
    OneChat.chatEnd = document.getElementById("ChatEnd")
    OneChat.onBottom = false
    OneChat.point = 0
    OneChat.firstTaken = true
    OneChat.addMsg = function(msgtype, msg) {
      if (!(msgtype == "err" || msgtype == "recv" || msgtype == "send" || (! RegExp('/^[0-9]+$').test(msg["icon"])) )) {
        msgtype = "err"
        msg = {
          "msg": "You got error. (Invalid message)",
          "sender": "Chat system",
        }
      }
      var datetime = new Date()
      var timestamp = datetime.toLocaleDateString() + " " + datetime.toLocaleTimeString()
      var chat = new ChatMsg(msg["msg"])
      var sender = new ChatMsg(msg["sender"])
      var isBottom = window.innerHeight - OneChat.chatEnd.getBoundingClientRect().y > -20
      OneChat.chatWindow.insertAdjacentHTML("beforeend", '<aside class="chatmsgbox chat_icon_' + msg["icon"] + ' chat_' + msgtype + '">' + '<div class="userinfo"><span class="username">' + sender.escapeHTML() + '</span><span class="timestamp">' + timestamp + '</span></div>' + '<p class="chatmsg">' +  chat.escapeHTML() + '</p></aside>')
      if (isBottom) { OneChat.chatEnd.scrollIntoView(true) }
      return true
    }
  
    OneChat.chatBox = document.getElementById("ChatBox")
    OneChat.chatText = document.getElementById("ChatText")
    OneChat.chatBox.addEventListener("submit", function(e) {
      var msg = {}
      msg["msg"] = OneChat.chatText.value
      msg["sender"] = OneChat.chatterName
      msg["session"] = OneChat.sessionID
      msg["icon"] = OneChat.icon
      if (msg["msg"].length > 256) {
        alert("Your Message too long.")
        e.stopPropagation()
        e.preventDefault()
        return void(0)
      }
      if (RegExp("^\s*$").test(msg["msg"])) {
        e.stopPropagation()
        e.preventDefault()
        return void(0)
      }
      if (RegExp('^/').test(msg["msg"])) {
        /* command mode */
        if (msg["msg"] == "/bye") {
          var oReq = new XMLHttpRequest()
          oReq.open("GET", OneChat.goodbyeURL + '?s=' + OneChat.sessionID)
          oReq.send()
          OneChat.addMsg("recv", {"msg": "You got logged out. Thank you for playing. See you again.", "sender": "Chat System"})
          window.clearTimeout(OneChat.timer)
        } else if (msg["msg"] == "/clear") {
          OneChat.chatWindow.innerHTML = ""
        } else {
          OneChat.addMsg("err", {"msg": (msg["msg"] + " is Unknown command."), "sender": "Chat System"})
        }
        OneChat.chatText.value = ""
      } else {
        var oReq = new XMLHttpRequest()
        oReq.open("POST", OneChat.senderURL)
        oReq.setRequestHeader("Content-Type", "application/json")
        oReq.onload = function() {
          if (OneChat.addMsg("send", msg)) {
            OneChat.chatText.value = ""
          }
        }
        oReq.onerror = function() {
          if (oReq.status == 412) {
            OneChat.addMsg("err", {"msg": "You don't have entry in this chat. Please re-login.", "sender": "Chat System"})
            window.clearTimeout(OneChat.timer)
          } else {
            OneChat.addMsg("err", {"msg": "Something happen.", "sender": "Chat System"})
          }
        }
        oReq.send(JSON.stringify(msg))
      }
      e.stopPropagation()
      e.preventDefault()
    })
    OneChat.getMessage = function() {
      var oReq = new XMLHttpRequest()
      oReq.open("GET", OneChat.readerURL + "?p=" + OneChat.point + '&s=' + OneChat.sessionID)
      oReq.onreadystatechange = function() {
        if (oReq.readyState == 4) {
          if (oReq.status == 200) {
            var recvMsg = JSON.parse(oReq.responseText)
            OneChat.point = recvMsg["point"]
            recvMsg["log"].forEach(function(i) {
              if (i["sender"] != OneChat.chatterName || OneChat.firstTaken) { OneChat.addMsg("recv", i) }
            })
            if (OneChat.firstTaken) { OneChat.firstTaken = false }
            nextInverval = 5000
          } else if (oReq.status == 204) {
            if (nextInverval < 20000) { nextInverval = nextInverval + 1000 }
            return void(0)
          } else if (oReq.status == 412) {
            OneChat.addMsg("err", {"msg": "You don't have entry in this chat. Please re-login.", "sender": "Chat System"})
            window.clearTimeout(OneChat.timer)
          } else {
            console.log("Server returns some error (" + oReq.status + ') on getting message.')
          }
        }
      }
      oReq.send()
      OneChat.timer = window.setTimeout(OneChat.getMessage, nextInverval)
    }
  }

  var regForm = document.getElementById("InitialForm")

  var initSubmit = function(e) {
    var oReq = new XMLHttpRequest()
    oReq.open("POST", regForm.action)
    oReq.setRequestHeader("Content-Type", "application/json")
    oReq.onload = function() {
      if (oReq.readyState == 4) {
        if (oReq.status == 200) {
          var param = JSON.parse(oReq.responseText)
          OneChat.chatterName = regForm.chatter_name.value
          OneChat.sessionID = param["sessionID"]
          OneChat.openID = param["openID"]
          

          alert("OK, please enjoy OneChat!")
          document.getElementById("InitialWindow").style.display = "none"
          OneChat.chatWindow = document.getElementById("ChatWindow")
          OneChat.chatWindow.style.display = "initial"
          document.getElementById("ChatFormLayout").style.display = "initial"
          mainFunction()
          OneChat.getMessage()
        } else if (oReq.status == 409) {
          alert("The name is already in use. Please try another name.")
        } else {
          alert("You got error. Maybe you submit invalid thing.")
        }
      }
    }
    oReq.onerror = function() {
      alert("You got error. (server unavilable?)")
    }
    oReq.send(JSON.stringify({"name": regForm.chatter_name.value, "icon": OneChat.icon}))
  }

  regForm.addEventListener("submit", function(event) {
    var cName = event.target.chatter_name.value
    if (RegExp('[!?&"' + "'" +  '<>#]').test(cName) || cName.length > 48 || RegExp('^\s*$').test(cName)) {
      alert("Your name is invalid.")
      event.stopPropagation()
      event.preventDefault()
      return void(0)
    } else {
      /* Set my icon */
      OneChat.icon = regForm.icon.value
      initSubmit(event)
      event.stopPropagation()
      event.preventDefault()
    }
  })
})()