#!/bin/bash
# will do a release to ECS
# and update the corresponding load balancer code

ECR_PATH="842868011138.dkr.ecr.us-east-1.amazonaws.com/beef"
WEBNAME="beef"
aws ecr get-login-password --region us-east-1 | docker login  \
  --username AWS \
  --password-stdin 842868011138.dkr.ecr.us-east-1.amazonaws.com
cd server 
docker build -t $WEBNAME .
docker tag $WEBNAME:latest $ECR_PATH:latest
docker push $ECR_PATH:latest

# push deployment out to ECR
ecs-cli push $WEBNAME

