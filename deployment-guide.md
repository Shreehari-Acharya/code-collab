# NOTES TO REMEMBER WHILE DEPLOYING

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
