# Totem Server

Este README descreve como construir e executar o Totem Server usando Docker.

## Pré-requisitos

* Docker instalado
* Git
* Acesso ao repositório do Totem Server

## 1. Clonar o repositório

```bash
git clone https://github.com/3Access/Totem_Acesso_Server.git
cd Totem_Acesso_Server
```

## 2. Build da imagem Docker

No diretório raiz do projeto (onde está o `Dockerfile`):

```bash
docker build -t totem-server .
```

## 3. Executar o container

```bash
docker run -d \
  --name totem-server \
  -p 8085:8085 \
  totem-server
```

* A aplicação ficará disponível em `http://localhost:8085/`

## 4. Atualizar código em produção

1. No servidor, entre no diretório do projeto:

   ```bash
   cd ~/3access/Totem_Acesso_Server
   ```
2. Puxe as mudanças do Git:

   ```bash
   ```

git pull

````
3. Rebuild da imagem:
   ```bash
docker build -t totem-server .
````

4. Pare e remova o container em execução:

   ```bash
   ```

docker stop totem-server
docker rm totem-server

````
5. Execute novamente:
   ```bash
docker run -d --name totem-server -p 8085:8085 totem-server
````

## 5. Logs e manutenção

* Para ver logs do container:

  ```bash
  ```

docker logs -f totem-server

````
- Para parar e remover:
  ```bash
docker stop totem-server && docker rm totem-server
````
