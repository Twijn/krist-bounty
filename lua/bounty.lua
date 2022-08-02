local WS_URI = "ws://127.0.0.1:8080"
local NONCE_LENGTH = 8

local RETRY_INTERVAL = 5
local MAX_RETRIES = 20

local PRIVATE_KEY_FILE = ".bounty-pvk"

local charset = {}  do -- [0-9a-zA-Z]
    for c = 48, 57  do table.insert(charset, string.char(c)) end
    for c = 65, 90  do table.insert(charset, string.char(c)) end
    for c = 97, 122 do table.insert(charset, string.char(c)) end
end

local function randomString(length)
    if not length or length <= 0 then return '' end
    math.randomseed(os.clock()^5)
    return randomString(length - 1) .. charset[math.random(1, #charset)]
end

local args = {...}

local id = ""
local privateKey = ""

if fs.exists(PRIVATE_KEY_FILE) then
    local f = fs.open(PRIVATE_KEY_FILE, "r")
    id = f.readLine()
    privateKey = f.readLine()
    f.close()
else
    if args ~= nil and #args > 0 then
        id = args[1]
        privateKey = randomString(64)
    else
        error("specify a unique ID for the shop front")
    end
    local f = fs.open(PRIVATE_KEY_FILE, "w")
    f.writeLine(id)
    f.writeLine(privateKey)
    f.close()
end

local function connect(retryCount)
    retryCount = retryCount or 0
    http.websocketAsync(WS_URI)

    local e, url, arg
    repeat
        e, url, arg = os.pullEvent()
    until url == WS_URI and (e == "websocket_success" or e == "websocket_failure")

    if e == "websocket_success" then
        print("Connection established!")
        os.queueEvent("websocket_ready")
        return arg
    else
        if retryCount < MAX_RETRIES then
            print("Failed connection: " .. arg)
            print("Retrying in "..RETRY_INTERVAL.." seconds ("..retryCount+1 .."/".. MAX_RETRIES..")...")
            sleep(RETRY_INTERVAL)
            return connect(retryCount + 1)
        else
            error(arg)
        end
    end
end

local ws = connect()

local function send(msgType, msg)
    msg = msg or {}
    if not ws then
        repeat print("No websocket available. Waiting to send message") sleep(2) until ws
    end
    local nonce = randomString(NONCE_LENGTH)

    msg.type = msgType
    msg.nonce = nonce

    ws.send(textutils.serializeJSON(msg))

    local e, r_nonce, msg
    repeat
        e, r_nonce, msg = os.pullEvent("websocket_reply")
    until nonce == r_nonce

    return msg
end

local function ready()
    local registerResult = send("postShop", {
        id = id,
        private = privateKey
    }, ws)
    if registerResult.success then
        print("Successfully authenticated as " .. registerResult.id)
    else
        error("failed authentication: " .. registerResult.error)
    end
end

local function catchReady()
    while true do
        os.pullEvent("websocket_ready")
        ready()
    end
end

local function catchClosed()
    while true do
        local e, url = os.pullEvent("websocket_closed")

        if url == WS_URI then
            print("Websocket connection was closed")
            print("Reestablishing in 3 seconds...")
            ws = connect()
        end
    end
end

local function catchMessage()
    while true do
        local e, url, msg = os.pullEvent("websocket_message")

        if url == WS_URI then
            local json = textutils.unserializeJSON(msg)
            if json ~= nil then
                if json.nonce then
                    os.queueEvent("websocket_reply", json.nonce, json)
                end
            else
                print("Received improper message from WS: " .. msg)
            end
        end
    end
end

parallel.waitForAll(catchReady, catchClosed, catchMessage)
