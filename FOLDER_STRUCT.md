# LMS Backend Project Structure

## Root Directory
- .env
- .env.example
- .eslintrc.js
- .git/
- .gitignore
- .npmrc
- .prettierrc.json
- .qodo/
- README.md
- build-all.ps1
- build-all.sh
- deployments/
- dist/
- docker-compose.yml
- docs/
- libs/
- node_modules/
- package.json
- packages/
- pnpm-lock.yaml
- pnpm-workspace.yaml
- scripts/
- services/
- tsconfig.build.json
- tsconfig.json

## Services Directory
- analytics-service/
- api-gateway/
- assessment-service/
- course-service/
- file-service/
- live-session-service/
- notification-service/
- payment-service/
- user-service/

## Packages Directory
- config/
- constants/
- middleware/

## Libs Directory
- common/
- database/
- logger/
- types/
- utils/
- validation/

## Docs Directory
- api/
- architecture/
- deployment/

## Ladder-Style File Structure

```
lms-backend/
├── .env
├── .env.example
├── .eslintrc.js
├── .git/
├── .gitignore
├── .npmrc
├── .prettierrc.json
├── .qodo/
├── README.md
├── build-all.ps1
├── build-all.sh
├── deployments/
├── dist/
├── docker-compose.yml
├── docs/
│   ├── api/
│   ├── architecture/
│   └── deployment/
├── libs/
│   ├── common/
│   │   ├── dist/
│   │   ├── node_modules/
│   │   ├── package.json
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── tsconfig.tsbuildinfo
│   ├── database/
│   ├── logger/
│   ├── types/
│   ├── utils/
│   └── validation/
├── node_modules/
├── package.json
├── packages/
│   ├── config/
│   ├── constants/
│   └── middleware/
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── scripts/
├── services/
│   ├── analytics-service/
│   ├── api-gateway/
│   │   ├── dist/
│   │   ├── node_modules/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── utils/
│   │   ├── tsconfig.json
│   ├── assessment-service/
│   ├── course-service/
│   ├── file-service/
│   ├── live-session-service/
│   ├── notification-service/
│   ├── payment-service/
│   └── user-service/
├── tsconfig.build.json
└── tsconfig.json
```
