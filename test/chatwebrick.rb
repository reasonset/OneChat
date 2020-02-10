#!/usr/bin/ruby

require 'webrick'
require 'json'
require 'date'
require 'openssl'

srv = WEBrick::HTTPServer.new({ :DocumentRoot => './',
                                :BindAddress => '127.0.0.1',
                                :Port => 20000})


SESSIONS = {}
NAMELIST = {}
LOG = []
@logpoint = 0

srv.mount_proc "/send" do |req, res|
  reqson = req.body&.force_encoding("UTF-8")
  if(reqson && reqson.valid_encoding? && (json = JSON.load(reqson) rescue nil) && SESSIONS[json["session"]] && (chat = json["msg"]&.force_encoding("UTF-8")) && chat.valid_encoding? && chat.length > 0)
    LOG.push({"msg" => chat[0, 256], "sender" => SESSIONS[json["session"]][:name], "icon" => SESSIONS[json["session"]][:icon]})
    if LOG.length > 200
      # File.open("archives/#{DateTime.now.strftime('%Y%m%d%H%M%S')}.json") {|f| JSON.dump(LOG[0, 100], f)}
      LOG.slice!(0, 100)
    end
    @logpoint += 1
    SESSIONS[json["session"]][:lastseen] = DateTime.now
    res.status = 204
  else
    res.status = 400
  end
end

srv.mount_proc "/read" do |req, res|
  q = req.query
  unless (/^[0-9]$/ === q["p"])
    res.status = 400
    return
  end
  qp = q["p"].to_i
  s = q["n"]&.force_encoding("UTF-8")
  log_diff = @logpoint - qp
  log_diff = 100 if log_diff > 100
  if log_diff > 0
    log_slice = LOG.last(log_diff)
    log_slice = log_slice.reject {|i| i["sender"] == s }
    res.body = JSON.dump({"point" => @logpoint, "log" => log_slice})
    res.content_type = "application/json; charset=UTF-8"
  else
    res.status = 204
  end
end

srv.mount_proc "/init" do |req, res|
  reqson = req.body&.force_encoding("UTF-8")
  if(reqson && reqson.valid_encoding? && (json = JSON.load(reqson) rescue nil) && json["name"] && (name = json["name"].force_encoding("UTF-8")).length <= 48 && name != /^\s*$/ && name.count("!?&\"'<>#") == 0 && (icon = json["icon"].to_s) =~ /^[0-9]+$/ && !NAMELIST[name] )
    sess = OpenSSL::Digest::SHA256.hexdigest(name + DateTime.now.to_s + req.header["user-agent"].to_s + req.addr[3].to_s + req.addr[4].to_s + "SALT")
    chatter = {session: sess, name: name, lastseen: DateTime.now, icon: icon}
    SESSIONS[chatter[:session]] = chatter
    NAMELIST[name] = chatter[:session]
    res.body = JSON.dump({"sessionID" => sess})
    res.content_type = "application/json; charset=UTF-8"
  elsif NAMELIST[name]
    res.status = 409
    res.body = "CONFLICT"
  else
    res.status = 400
    res.body = "INVALID"
  end
end


srv.mount_proc "/" do |req, res|
  if req.path =~ %r!/(?:index\.[a-z]+)?$!
    res.body = File.read("test.html")
    res.content_type = "text/html; charset=UTF-8"
  else
    res.status = 404
  end
end

srv.mount_proc "/chat.js" do |req, res|
  res.body = File.read("../static/chat.js")
  res.content_type = "application/javascript; charset=UTF-8"
end

srv.mount_proc "/skin.css" do |req, res|
  res.body = File.read("../static/skin.css")
  res.content_type = "text/css; charset=UTF-8"
end

srv.mount_proc "/send.png" do |req, res|
  res.body = File.read("../static/send.png")
  res.content_type = "image/png"
end

srv.mount_proc "/icons" do |req, res|
  path = req.path[Regexp.new("[^/]+$")]
  unless path =~ /^[0-9]+$/
    res.status = 403
    return
  end
  unless File.exist?("icons/#{path}.jpeg")
    res.status = 403
    return
  end
  res.body = File.read "icons/#{path}.jpeg"
  res.content_type = "image/jpeg"
end

trap("INT"){ srv.shutdown }
srv.start
