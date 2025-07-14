# NOTES TO REMEMBER WHILE DEPLOYING
## Rough notes from chatgpt :)
- Create a seperate user who owns a folder called /workspace-storage
- The gid and uid of user must match with the uid and gid of the user owning the /workspace-storage in host machine

- the dockerode which will run must have access to /workspace-storage too. Better if we run backend by the user
who owns the /workspace-storage


- create a group and put user (the one inside docker) and host into the same. makes it easy

| Command                     | Purpose                     |
| --------------------------- | --------------------------- |
| `groupadd devgroup`         | Create group                |
| `usermod -aG devgroup user` | Add user to group           |
| `chown :devgroup folder`    | Change group ownership      |
| `chmod 770 folder`          | Grant rwx to group          |
| `chmod g+s folder`          | Make subfiles inherit group |


🎯 Goal
Expose a port (like 3000) from each user’s container to a public HTTPS subdomain, e.g.:

cpp
Copy
Edit
https://user123.myapp.com → container running on port 3000
🧩 Tech Stack Summary
Docker: Run each user's code server

Traefik: Reverse proxy, SSL certs, domain routing

Let's Encrypt: Auto HTTPS

✅ 1. Setup Domain and DNS
Buy a domain like myapp.com.

Create a wildcard subdomain:

*.myapp.com → your-server-IP

On Cloudflare / GoDaddy / Route53, add:

vbnet
Copy
Edit
Type: A
Host: *.myapp.com
Value: YOUR_SERVER_IP
TTL: Auto
✅ 2. Traefik Setup with Docker
Create this folder structure:

arduino
Copy
Edit
traefik-setup/
├── docker-compose.yml
├── traefik.toml
├── acme.json
🧾 acme.json (for HTTPS certs)
bash
Copy
Edit
touch acme.json
chmod 600 acme.json
⚙️ traefik.toml (Traefik config)
toml
Copy
Edit
[entryPoints]
  [entryPoints.web]
    address = ":80"

  [entryPoints.websecure]
    address = ":443"

[api]
  dashboard = true

[providers.docker]
  exposedByDefault = false

[certificatesResolvers.myresolver.acme]
  email = "you@example.com"
  storage = "acme.json"
  [certificatesResolvers.myresolver.acme.httpChallenge]
    entryPoint = "web"
🐳 docker-compose.yml
yaml
Copy
Edit
version: "3.9"

services:
  traefik:
    image: traefik:v2.11
    command:
      - --providers.docker=true
      - --providers.docker.exposedByDefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.myresolver.acme.httpchallenge=true
      - --certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.myresolver.acme.email=you@example.com
      - --certificatesresolvers.myresolver.acme.storage=/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./acme.json:/acme.json
🔒 Make sure acme.json has permissions 600.

Then run:

bash
Copy
Edit
docker compose up -d
Traefik is now reverse proxying with HTTPS on *.myapp.com.

✅ 3. Start a User Container with Traefik Labels
bash
Copy
Edit
docker run -d \
  --name user123-container \
  -p 3000 \
  -l traefik.enable=true \
  -l traefik.http.routers.user123.rule=Host(`user123.myapp.com`) \
  -l traefik.http.routers.user123.entrypoints=websecure \
  -l traefik.http.routers.user123.tls.certresolver=myresolver \
  -l traefik.http.services.user123.loadbalancer.server.port=3000 \
  your-user-image
Replace your-user-image with the image you're using for user environments.

✅ 4. Test
Visit:

arduino
Copy
Edit
https://user123.myapp.com
You should see the app running inside the container on port 3000.

✅ 5. Dynamically with Dockerode (Optional)
When using dockerode, add these labels while creating the container:

ts
Copy
Edit
Labels: {
  "traefik.enable": "true",
  [`traefik.http.routers.${username}.rule`]: `Host(\`${username}.myapp.com\`)`,
  [`traefik.http.routers.${username}.entrypoints`]: "websecure",
  [`traefik.http.routers.${username}.tls.certresolver`]: "myresolver",
  [`traefik.http.services.${username}.loadbalancer.server.port`]: "3000",
}
✅ 6. Enable Traefik Dashboard (Optional)
Visit http://your-server-ip:8080/dashboard/
Add this to docker-compose.yml:

yaml
Copy
Edit
    ports:
      - "8080:8080" # add this
