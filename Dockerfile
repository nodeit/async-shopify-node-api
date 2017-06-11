FROM node:7

MAINTAINER Chris Gregory <cgshopdev@gmail.com>

RUN npm i -g nodemon

WORKDIR /opt

COPY . /opt

RUN npm i