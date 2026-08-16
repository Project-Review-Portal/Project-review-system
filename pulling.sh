echo "executing git pull"
&& git pull

&& echo "running npm install in root"
&& npm install

&& echo "running npm install in backend"
&& cd backend && npm install && cd ..

&& echo "running npm install in frontend"
&& cd frontend && npm install && cd ..

echo "Done"

