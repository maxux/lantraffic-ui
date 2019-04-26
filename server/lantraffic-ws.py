import asyncio
import websockets
import json
import redis
import time

class LanTrafficServer():
    def __init__(self):
        self.wsclients = set()
        self.redis = redis.Redis()
        self.clients = {}

    async def wsbroadcast(self, payload):
        if not len(self.wsclients):
            return

        for client in list(self.wsclients):
            if not client.open:
                continue

            try:
                await client.send(json.dumps(payload))

            except Exception as e:
                print(e)

    async def handler(self, websocket, path):
        self.wsclients.add(websocket)

        print("[+] websocket: client connected")

        try:
            while True:
                if not websocket.open:
                    break

                await asyncio.sleep(1)

        finally:
            print("[+] websocket: client disconnected")
            self.wsclients.remove(websocket)

    async def redisloop(self):
        while True:
            self.clients = {}
            clients = self.redis.keys('traffic-*')

            for client in clients:
                payload = self.redis.get(client).decode('utf-8')
                live = json.loads(payload)

                # ignore inactive client
                if live['active'] < time.time() - (4 * 3600):
                    continue

                self.clients[live['addr']] = {
                    "timestamp": live['active'],
                    "mac-address": live['macaddr'],
                    "hostname": live['host'],
                    "ip-address": live['addr'],
                    "rx": live['rx'],
                    "tx": live['tx'],
                }

            await self.wsbroadcast(self.clients)
            await asyncio.sleep(1)

    def run(self):
        # standard polling handlers
        loop = asyncio.get_event_loop()
        loop.set_debug(True)

        # handle websocket communication
        websocketd = websockets.serve(self.handler, "0.0.0.0", 55574)
        asyncio.ensure_future(websocketd, loop=loop)
        asyncio.ensure_future(self.redisloop(), loop=loop)

        print("[+] waiting for clients or slaves")
        loop.run_forever()

if __name__ == '__main__':
    lanui = LanTrafficServer()
    lanui.run()
