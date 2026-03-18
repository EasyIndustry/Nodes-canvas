# Architecture - Nodes Canvas Studio

## Introducción
Este documento explica la estructura interna del editor de nodos para colaborar con IAs o nuevos desarrolladores.

## Estructura de Clases (Namespaced UI)
Utilizamos un objeto global `window.NodesCanvas` para evitar problemas de CORS originados por usar módulos ES6 locales (`file://`).

- **Canvas (`js/core/Canvas.js`)**: Modifica la transformación del DIV principal emitiendo *pan* y *zoom*. El fondo cuadriculado está atado vía CSS al offset (`backgroundPosition`).
- **Node (`js/core/Node.js`)**: Crea nodos arrastrables del DOM. Tienen conectores de entrada / salida llamados "sockets".
- **ConnectionManager y Connection (`js/core/Connection.js`)**: Dibuja en un `<svg>` ubicado sobre la capa base del canvas. Las curvas matemáticas (Bezier Cúbico) adaptan sus puntos de control basado en si el socket es `in` o `out`.
- **BottomMenu (`js/ui/BottomMenu.js`)**: Capta clicks de botones y lanza instancias nuevas en el centro del viewport del canvas.

## Modificaciones Futuras
Si decides incorporar un build tool (`Vite`/`Webpack`), elimina el namespace global `window.NodesCanvas` y sustitúyelo por `export / import`.


### Arquitectura de datos en la nube (XANO)

## tablas

- users : user_canvas_studio
- boards : board_canvas_studio
- funciones : custom_user_feature

# schemas 

user_canvas_studio {
  id: number;
  created_at: number;
  email: email;
  password: password;
  name: string;
  settings: json;
}

board_canvas_studio {
  id: number;
  created_at: number;
  user_canvas_studio_id: number;
  title: string;
  description: string;
  last_updated: number;
  settings: object;
}

custom_user_feature {
  id: number;
  created_at: number;
  name: string;
  description: string;
  user_canvas_studio_id: number;
  data: json;
}


### APIS rest

login, singup, etc



# signup

input: 

{
  "email": "user@example.com",
  "password": "string",
  "name": "string"
}

output: 

{
  "authToken": "string"
}

URL POST:

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/auth/signup



# login

input: 

{
  "email": "user@example.com",
  "password": "string"
}

output: 

{
  "authToken": "string"
}

URL POST

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/auth/login

# auth/me

input: 

{
  "authToken": "string"
}

output: 

{
  "id": 1,
  "created_at": 1710662400,
  "email": "[EMAIL_ADDRESS]",
  "name": "John Doe",
  "settings": {}
}

URL GET

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/auth/me


# Board

input:

{
  "user_canvas_studio_id": 0,
  "title": "string",
  "description": "string",
  "last_updated": 0,
  "settings": {}
}

output:

{
  "id": 0,
  "created_at": "now",
  "user_canvas_studio_id": 0,
  "title": "string",
  "description": "string",
  "last_updated": 0,
  "settings": {}
}

url POST

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/board_canvas_studio

# get single board

input:

{
  "board_canvas_studio_id": 0
}

output:

{
  "id": 0,
  "created_at": "now",
  "user_canvas_studio_id": 0,
  "title": "string",
  "description": "string",
  "last_updated": 0,
  "settings": {}
}

url GET

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/board_canvas_studio/{id}


# get all user boards

input:

{
  "user_canvas_studio_id": 0
}

output: (array of boards without settings)

[
    {
    "id": 0,
    "title": "string",
    "description": "string",
    "last_updated": 0,
    }
]

url GET

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/board_canvas_studio_user/{user_canvas_studio_id}

# update board

input: (board_canvas_studio_id is required)

{
  "user_canvas_studio_id": 0,
  "title": "string",
  "description": "string",
  "last_updated": 0,
  "settings": {}
}

output:

{
  "id": 0,
  "created_at": 0,
  "user_canvas_studio_id": 0,
  "title": "string",
  "description": "string",
  "last_updated": 0,
  "settings": {}
}

url PATCH

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/board_canvas_studio/{board_canvas_studio_id}

# delete board

input: 

{
  "board_canvas_studio_id": 0
}

output:  no response wait for 200 code

url DELETE

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/board_canvas_studio/{board_canvas_studio_id}

## Custom Features

# create custom feature

input:

{
  "name": "string",
  "description": "string",
  "user_canvas_studio_id": 0,
  "data": {}
}

output:

{
  "id": 0,
  "created_at": 0,
  "name": "string",
  "description": "string",
  "user_canvas_studio_id": 0,
  "data": {}
}

url POST

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/custom_user_features 

# get all user custom features

input:

{
  "user_canvas_studio_id": 0
}

output: 

[
    {
    "id": 0,
    "name": "string",
    "description": "string",
    "user_canvas_studio_id": 0,
    "data": {},
    "type":"string"
    }
]

url GET

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/custom_by_user_features/{user_canvas_studio_id}

# update custom feature

input: (custom_user_feature_id is required)

{
  "name": "string",
  "description": "string",
  "user_canvas_studio_id": 0,
  "data": {}
}

output:

{
  "id": 0,
  "created_at": 0,
  "name": "string",
  "description": "string",
  "user_canvas_studio_id": 0,
  "data": {}
}

url PATCH

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/custom_user_features/{custom_user_features_id}

# delete custom feature

URL DELETE

https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/custom_user_features/{custom_user_features_id}
