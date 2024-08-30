Esse projeto faz parte do teste técnico para o processo seletivo da empresa Shopper. Se trata do back-end de um serviço que gerencia a leitura individualizada de consumo de água e gás. Para facilitar a coleta da informação, o serviço utilizará IA para obter a medição através da foto de um medidor.

O projeto foi construído com Nodejs, Hono, Drizzle, zod e Neon PostgreSql.

Primeiramente, copie o projeto utilizando git clone.

1. Para o projeto funcionar corretamente, é necessário criar o arquivo .env na raíz do projeto com as seguintes variáveis:

GEMINI_API_KEY=
DATABASE_URL=

2. Para resgatar a chave do google gemini, basta seguir os passos desse link: https://ai.google.dev/gemini-api/docs/api-key

3. Para resgatar a url de conexão com o banco de dados, basta criar uma conta gratuita no site Neon: https://neon.tech

4. Após criar a conta, na tab Quickstart, selecione a opção 'Postgres', copie a url e cole no arquivo .env.

5. Utilize o comando 'npm run db:migrate' para sincronizar as tabelas com o banco de dados Neon.

6. Utilize o comando 'docker-compose up' para construir a image e iniciar o container.

7. Teste a aplicação!

# teste-tecnico-shopper
